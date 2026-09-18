INSERT INTO properties (title,location,type,price,currency,image_url,description,status)
SELECT * FROM (VALUES
('Meridian Residence 01','Dubai, UAE','Luxury residence',4800000,'USD',NULL,'Premium residential inventory record.','available'),
('Aurelia Tower — Suite 18','Lagos, Nigeria','Commercial',2100000,'USD',NULL,'Commercial property inventory record.','available'),
('Westbridge House','London, UK','Private office',6400000,'USD',NULL,'Private office inventory record.','available')
) AS seed(title,location,type,price,currency,image_url,description,status)
WHERE NOT EXISTS (SELECT 1 FROM properties);