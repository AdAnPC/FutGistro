ALTER TABLE "torneos" ADD COLUMN "categoria_id" integer;--> statement-breakpoint
ALTER TABLE "torneos" ADD COLUMN "organizador_id" integer;--> statement-breakpoint
ALTER TABLE "torneos" ADD CONSTRAINT "torneos_categoria_id_categorias_id_fk" FOREIGN KEY ("categoria_id") REFERENCES "public"."categorias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "torneos" ADD CONSTRAINT "torneos_organizador_id_escuelas_id_fk" FOREIGN KEY ("organizador_id") REFERENCES "public"."escuelas"("id") ON DELETE no action ON UPDATE no action;