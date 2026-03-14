# from backend.utils.db import fetch_all

# def list_audit_logs(limit: int, action: str | None, entity: str | None) -> list[dict]:
#     where = []
#     params = []

#     if action:
#         where.append("a.action = %s")
#         params.append(action)

#     if entity:
#         where.append("a.entity = %s")
#         params.append(entity)

#     where_sql = ("WHERE " + " AND ".join(where)) if where else ""

#     return fetch_all(
#         f"""
#         SELECT
#           a.id,
#           a.actor_id,
#           u.email AS actor_email,
#           a.action,
#           a.entity,
#           a.entity_id,
#           a.payload,
#           a.created_at
#         FROM audit_log a
#         LEFT JOIN users u ON u.id = a.actor_id
#         {where_sql}
#         ORDER BY a.created_at DESC
#         LIMIT %s;
#         """,
#         params + [limit],
#     )


from __future__ import annotations

import json
from typing import Any
from uuid import UUID

from backend.utils.db import fetch_all

USER_ID_KEYS = {"owner_id", "created_by", "updated_by", "uploaded_by", "user_id"}


def _safe_uuid(value: Any) -> str | None:
    if not value:
        return None
    try:
        return str(UUID(str(value)))
    except Exception:
        return None


def _normalize_payload(payload: Any) -> Any:
    if isinstance(payload, str):
        try:
            return json.loads(payload)
        except Exception:
            return payload
    return payload


def _collect_user_ids_from_obj(obj: Any, bucket: set[str]) -> None:
    if not isinstance(obj, dict):
        return

    for key, value in obj.items():
        if key in USER_ID_KEYS:
            uid = _safe_uuid(value)
            if uid:
                bucket.add(uid)
        elif isinstance(value, dict):
            _collect_user_ids_from_obj(value, bucket)
        elif isinstance(value, list):
            for item in value:
                if isinstance(item, dict):
                    _collect_user_ids_from_obj(item, bucket)


def _enrich_obj_with_user_labels(obj: Any, user_map: dict[str, str]) -> Any:
    if not isinstance(obj, dict):
        return obj

    enriched = {}

    for key, value in obj.items():
        if isinstance(value, dict):
            enriched[key] = _enrich_obj_with_user_labels(value, user_map)
            continue

        if isinstance(value, list):
            enriched[key] = [
                _enrich_obj_with_user_labels(item, user_map) if isinstance(item, dict) else item
                for item in value
            ]
            continue

        enriched[key] = value

        if key in USER_ID_KEYS:
            uid = _safe_uuid(value)
            if uid:
                label_key = key.replace("_id", "_email") if key.endswith("_id") else f"{key}_email"
                enriched[label_key] = user_map.get(uid)

    return enriched


def list_audit_logs(limit: int, action: str | None, entity: str | None) -> list[dict]:
    where = []
    params = []

    if action:
        where.append("a.action = %s")
        params.append(action)

    if entity:
        where.append("a.entity = %s")
        params.append(entity)

    where_sql = ("WHERE " + " AND ".join(where)) if where else ""

    logs = fetch_all(
        f"""
        SELECT
          a.id,
          a.actor_id,
          u.email AS actor_email,
          a.action,
          a.entity,
          a.entity_id,
          a.payload,
          a.created_at
        FROM audit_log a
        LEFT JOIN users u ON u.id = a.actor_id
        {where_sql}
        ORDER BY a.created_at DESC
        LIMIT %s;
        """,
        params + [limit],
    )

    if not logs:
        return logs

    user_ids: set[str] = set()

    for log in logs:
        actor_id = _safe_uuid(log.get("actor_id"))
        if actor_id:
            user_ids.add(actor_id)

        payload = _normalize_payload(log.get("payload"))
        log["payload"] = payload
        _collect_user_ids_from_obj(payload, user_ids)

    if not user_ids:
        return logs

    user_rows = fetch_all(
        """
        SELECT id, email
        FROM users
        WHERE id = ANY(%s::uuid[])
        """,
        [list(user_ids)],
    )

    user_map = {str(row["id"]): row["email"] for row in user_rows}

    enriched_logs = []
    for log in logs:
        enriched_logs.append(
            {
                **log,
                "payload": _enrich_obj_with_user_labels(log.get("payload"), user_map),
            }
        )

    #print("AUDIT ENRICHED SAMPLE:", enriched_logs[0] if enriched_logs else None)
    return enriched_logs