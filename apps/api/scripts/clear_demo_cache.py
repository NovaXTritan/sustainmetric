"""Clear cached queries for the demo tenant."""

from __future__ import annotations

from db.client import get_supabase


def run():
    sb = get_supabase()
    demo_tenant = "00000000-0000-0000-0000-000000000001"

    result = sb.table("queries").select("id").eq("tenant_id", demo_tenant).execute()
    ids = [row["id"] for row in result.data or []]
    print(f"Found {len(ids)} queries for demo tenant")

    if ids:
        sb.table("queries").delete().eq("tenant_id", demo_tenant).execute()
        print("All demo queries deleted (CASCADE removes query_inputs + query_outputs)")


if __name__ == "__main__":
    run()
