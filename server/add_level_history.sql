IF NOT EXISTS (
  SELECT * FROM sys.columns 
  WHERE object_id = OBJECT_ID(N'[dbo].[progress]') 
  AND name = 'levelHistory'
)
BEGIN
  ALTER TABLE progress ADD levelHistory VARCHAR(MAX);
END
GO
