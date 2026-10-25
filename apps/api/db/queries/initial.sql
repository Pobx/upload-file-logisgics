-- name: GetDocumentTypes :many
SELECT id, code, name, created_at FROM document_types ORDER BY id ASC;

-- name: CheckHealth :one
SELECT 1;
