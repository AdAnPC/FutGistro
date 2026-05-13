CREATE TABLE "system_backups" (
	"id" serial PRIMARY KEY NOT NULL,
	"datos" text NOT NULL,
	"total_registros" integer DEFAULT 0 NOT NULL,
	"tamano_kb" integer DEFAULT 0 NOT NULL,
	"tipo" varchar(20) DEFAULT 'automatico' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
