"""Run SQL migrations against Supabase Postgres directly.

Usage:
    python -m scripts.run_migrations <database_password>

The password is the one you set when creating the Supabase project.
Find it at: Dashboard > Settings > Database > Connection string
"""

from __future__ import annotations

import sys
from pathlib import Path

import psycopg2  # type: ignore[import-untyped]


def run():
    if len(sys.argv) < 2:
        print("Usage: python -m scripts.run_migrations <database_password>")
        print()
        print("Find your database password at:")
        print("https://supabase.com/dashboard/project/qriwvtmveytdbrcgshuo/settings/database")
        print("Under 'Connection string' > copy the password")
        sys.exit(1)

    password = sys.argv[1]
    host = "db.qriwvtmveytdbrcgshuo.supabase.co"
    port = 5432
    dbname = "postgres"
    user = "postgres"

    print(f"Connecting to {host}:{port}/{dbname}...")

    conn = psycopg2.connect(
        host=host,
        port=port,
        dbname=dbname,
        user=user,
        password=password,
        sslmode="require",
    )
    conn.autocommit = True
    cur = conn.cursor()

    migrations_dir = Path(__file__).parent.parent / "migrations"
    migration_files = sorted(migrations_dir.glob("*.sql"))

    for mig_file in migration_files:
        print(f"\n=== Running {mig_file.name} ===")
        sql = mig_file.read_text(encoding="utf-8")

        try:
            cur.execute(sql)
            print(f"  OK — {mig_file.name} completed")
        except Exception as e:
            print(f"  ERROR — {mig_file.name}: {e}")
            # Continue with remaining migrations
            conn.rollback()
            conn.autocommit = True

    # Verify
    print("\n=== Verification ===")

    cur.execute(
        "SELECT extname FROM pg_extension WHERE extname = 'vector'"
    )
    rows = cur.fetchall()
    print(f"pgvector: {'ENABLED' if rows else 'MISSING'}")

    cur.execute(
        "SELECT tablename FROM pg_tables "
        "WHERE schemaname = 'public' ORDER BY tablename"
    )
    tables = [r[0] for r in cur.fetchall()]
    print(f"Tables ({len(tables)}): {', '.join(tables)}")

    cur.execute(
        "SELECT tablename, rowsecurity FROM pg_tables "
        "WHERE schemaname = 'public' "
        "AND tablename IN ("
        "'queries','query_inputs','query_outputs','audit_log',"
        "'sites','projects','brsr_exports','users','policy_chunks'"
        ") ORDER BY tablename"
    )
    rls_rows = cur.fetchall()
    print("RLS status:")
    for name, enabled in rls_rows:
        print(f"  {name}: {'ENABLED' if enabled else 'DISABLED'}")

    cur.close()
    conn.close()
    print("\nDone.")


if __name__ == "__main__":
    run()
