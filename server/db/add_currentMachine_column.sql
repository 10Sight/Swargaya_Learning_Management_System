-- Adds the currentMachine column to dbo.users.
-- This is applied automatically at server startup by User.init() (server/models/auth.model.js),
-- so running this script manually is only needed for out-of-band verification/inspection.
--
-- currentMachine is a plain nullable INT referencing machines.id, resolved and validated at the
-- application layer (see updateUser/createUser in server/controllers/user.controller.js and
-- register in server/controllers/auth.controller.js) rather than via a DB foreign key, consistent
-- with how every other cross-table reference in this schema (users.department, machines.operatorId,
-- etc.) is handled.
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'currentMachine'
)
BEGIN
    ALTER TABLE dbo.users ADD currentMachine INT NULL;
END
