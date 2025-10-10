use diesel_async::pooled_connection::{AsyncDieselConnectionManager, ManagerConfig};
use trieve_server::{
    errors::ServiceError,
    establish_connection, get_env,
    operators::{
        chunk_operator::get_pg_point_ids_from_qdrant_point_ids,
        qdrant_operator::{
            delete_points_from_qdrant, get_qdrant_collections, scroll_qdrant_collection_ids,
        },
    },
};

async fn retry_operation<F, Fut, T, E>(
    operation: F,
    max_retries: u32,
    operation_name: &str,
) -> Result<T, E>
where
    F: Fn() -> Fut,
    Fut: std::future::Future<Output = Result<T, E>>,
    E: std::fmt::Display,
{
    for attempt in 1..=max_retries {
        println!("{} (attempt {}/{})", operation_name, attempt, max_retries);

        match operation().await {
            Ok(result) => return Ok(result),
            Err(e) => {
                println!("Error on attempt {}: {}", attempt, e);
                if attempt < max_retries {
                    println!("Retrying in 2 seconds...");
                    tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;
                } else {
                    println!("Max retries reached");
                    return Err(e);
                }
            }
        }
    }

    unreachable!("Loop should always return");
}

#[allow(clippy::print_stdout)]
#[tokio::main]
async fn main() -> Result<(), ServiceError> {
    dotenvy::dotenv().ok();

    let database_url = get_env!("DATABASE_URL", "DATABASE_URL is not set");

    let mut config = ManagerConfig::default();
    config.custom_setup = Box::new(establish_connection);

    let mgr = AsyncDieselConnectionManager::<diesel_async::AsyncPgConnection>::new_with_config(
        database_url,
        config,
    );

    let pool = diesel_async::pooled_connection::deadpool::Pool::builder(mgr)
        .max_size(3)
        .build()
        .expect("Failed to create diesel_async pool");

    let web_pool = actix_web::web::Data::new(pool.clone());

    let collections = get_qdrant_collections().await?;
    let mut total = 0;

    let start_offset = std::env::var("OFFSET")
        .ok()
        .and_then(|offset_str| uuid::Uuid::parse_str(&offset_str).ok())
        .unwrap_or(uuid::Uuid::nil());

    println!("Starting from offset: {}", start_offset);

    for collection in collections {
        println!("starting on collection: {:?}", collection);

        let mut offset = Some(start_offset.to_string());

        while let Some(cur_offset) = offset {
            println!("cur_offset: {}", cur_offset);

            let collection_clone = collection.clone();
            let cur_offset_clone = cur_offset.to_string();

            let (qdrant_point_ids, new_offset) = retry_operation(
                || async {
                    scroll_qdrant_collection_ids(
                        collection_clone.clone(),
                        Some(cur_offset_clone.clone()),
                        Some(10000),
                    )
                    .await
                },
                3,
                "Scrolling Qdrant collection",
            )
            .await?;

            let pg_point_ids_and_datasets =
                get_pg_point_ids_from_qdrant_point_ids(qdrant_point_ids.clone(), web_pool.clone())
                    .await?;

            let pg_point_ids = pg_point_ids_and_datasets
                .iter()
                .map(|(x, _)| *x)
                .collect::<Vec<uuid::Uuid>>();

            total += qdrant_point_ids.len();

            let qdrant_points_missing = qdrant_point_ids
                .iter()
                .filter(|x| !pg_point_ids.contains(x))
                .map(|x| *x)
                .collect::<Vec<uuid::Uuid>>();

            if !qdrant_points_missing.is_empty() {
                println!(
                    "len of qdrant_point_ids_not_in_pg: {:?}",
                    qdrant_points_missing.len(),
                );

                delete_points_from_qdrant(qdrant_points_missing, collection.clone()).await?;
            } else {
                println!(
                    "{:?} Scrolled {}(qd) {}(pg) /{}",
                    qdrant_point_ids.get(0),
                    qdrant_point_ids.len(),
                    pg_point_ids.len(),
                    total
                );
            }

            offset = new_offset;
        }
    }

    Ok(())
}
