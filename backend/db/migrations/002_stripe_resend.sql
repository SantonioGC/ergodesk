ALTER TABLE checkout_sesiones
ADD COLUMN stripe_orden_id INT NULL AFTER paso;

ALTER TABLE pagos
ADD COLUMN stripe_session_id VARCHAR(255) NULL UNIQUE AFTER referencia,
ADD COLUMN stripe_payment_intent_id VARCHAR(255) NULL AFTER stripe_session_id,
ADD COLUMN correo_estado ENUM('pendiente', 'procesando', 'enviado', 'error') NOT NULL DEFAULT 'pendiente' AFTER stripe_payment_intent_id,
ADD COLUMN correo_intento_en TIMESTAMP NULL AFTER correo_estado,
ADD COLUMN correo_enviado_en TIMESTAMP NULL AFTER correo_intento_en,
ADD COLUMN correo_error TEXT NULL AFTER correo_enviado_en;

UPDATE checkout_sesiones SET pago_metodo = 'stripe' WHERE pago_metodo = 'tarjeta';
UPDATE checkout_sesiones SET pago_metodo = NULL WHERE pago_metodo = 'mercadopago';
