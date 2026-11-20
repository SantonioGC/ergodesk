ALTER TABLE pagos
ADD COLUMN modo ENUM('sandbox', 'produccion') NOT NULL DEFAULT 'sandbox';

UPDATE pagos SET modo = 'sandbox';
ALTER TABLE productos ADD COLUMN galeria JSON NULL AFTER imagen;
