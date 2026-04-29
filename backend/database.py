import mysql.connector
from mysql.connector import pooling
import os
from dotenv import load_dotenv

load_dotenv()

db_pool = pooling.MySQLConnectionPool(
    pool_name="elevantia_pool",
    pool_size=30,  # increase later if needed
    pool_reset_session=True,
    host=os.getenv("DB_HOST"),
    port=int(os.getenv("DB_PORT")),
    user=os.getenv("DB_USER"),
    password=os.getenv("DB_PASSWORD"),
    database=os.getenv("DB_NAME"),
)

def get_db():
    try:
        return db_pool.get_connection()
    except Exception as e:
        print("DB CONNECTION ERROR:", e)
        raise