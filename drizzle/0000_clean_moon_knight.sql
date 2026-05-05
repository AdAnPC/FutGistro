CREATE TYPE "public"."rol" AS ENUM('superadmin', 'administrador', 'entrenador');--> statement-breakpoint
CREATE TYPE "public"."asistencia_estado" AS ENUM('presente', 'ausente', 'tardanza', 'justificado');--> statement-breakpoint
CREATE TYPE "public"."pago_estado" AS ENUM('pagado', 'pendiente');--> statement-breakpoint
CREATE TYPE "public"."partido_estado" AS ENUM('programado', 'finalizado', 'cancelado');--> statement-breakpoint
CREATE TYPE "public"."torneo_estado" AS ENUM('inscripciones', 'en_progreso', 'finalizado');--> statement-breakpoint
CREATE TYPE "public"."participante_estado" AS ENUM('invitado', 'pendiente', 'confirmado', 'rechazado');--> statement-breakpoint
CREATE TABLE "escuelas" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" varchar(150) NOT NULL,
	"direccion" varchar(255),
	"departamento" varchar(100),
	"ciudad" varchar(100),
	"telefono" varchar(20),
	"director" varchar(150),
	"email" varchar(100),
	"activa" boolean DEFAULT true NOT NULL,
	"precio_mensualidad" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"logo" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "escuelas_nombre_unique" UNIQUE("nombre")
);
--> statement-breakpoint
CREATE TABLE "usuarios" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" varchar(100) NOT NULL,
	"email" varchar(100) NOT NULL,
	"password" varchar(255) NOT NULL,
	"rol" "rol" DEFAULT 'entrenador' NOT NULL,
	"escuela_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "usuarios_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "categorias" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" varchar(50) NOT NULL,
	"edad_min" integer NOT NULL,
	"edad_max" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "categorias_nombre_unique" UNIQUE("nombre")
);
--> statement-breakpoint
CREATE TABLE "jugadores" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" varchar(150) NOT NULL,
	"fecha_nacimiento" date NOT NULL,
	"documento" varchar(50) NOT NULL,
	"direccion" varchar(255),
	"telefono" varchar(20),
	"lugar_nacimiento" varchar(100),
	"departamento_nacimiento" varchar(100),
	"estatura" varchar(20),
	"peso" varchar(20),
	"tipo_sangre" varchar(10),
	"eps" varchar(100),
	"cc_padre" varchar(50),
	"nombre_madre" varchar(150),
	"cc_madre" varchar(50),
	"departamento_residencia" varchar(100),
	"ciudad" varchar(100),
	"numero_fijo" varchar(20),
	"nombre_padre" varchar(150),
	"telefono_padre" varchar(20),
	"escuela_id" integer,
	"foto" varchar(255),
	"registro_civil" varchar(255),
	"documento_acudiente" varchar(255),
	"documento_extra1" varchar(255),
	"documento_extra2" varchar(255),
	"documento_extra3" varchar(255),
	"documento_extra4" varchar(255),
	"firma_padre" varchar(255),
	"firma_entrenador" varchar(255),
	"categoria_id" integer,
	"fecha_registro" date DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "jugadores_documento_unique" UNIQUE("documento")
);
--> statement-breakpoint
CREATE TABLE "asistencias" (
	"id" serial PRIMARY KEY NOT NULL,
	"jugador_id" integer NOT NULL,
	"fecha" date NOT NULL,
	"estado" "asistencia_estado" DEFAULT 'presente' NOT NULL,
	"observacion" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pagos" (
	"id" serial PRIMARY KEY NOT NULL,
	"jugador_id" integer NOT NULL,
	"mes" integer NOT NULL,
	"anio" integer NOT NULL,
	"monto" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"estado" "pago_estado" DEFAULT 'pendiente' NOT NULL,
	"fecha_pago" date,
	"metodo_pago" varchar(50),
	"referencia" varchar(100),
	"notas" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "torneos" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" varchar(150) NOT NULL,
	"ciudad" varchar(100) NOT NULL,
	"fecha" date NOT NULL,
	"descripcion" text,
	"estado" "torneo_estado" DEFAULT 'inscripciones' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "torneo_participantes" (
	"id" serial PRIMARY KEY NOT NULL,
	"torneo_id" integer NOT NULL,
	"escuela_id" integer NOT NULL,
	"estado" "participante_estado" DEFAULT 'pendiente' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "partidos" (
	"id" serial PRIMARY KEY NOT NULL,
	"torneo_id" integer NOT NULL,
	"escuela_local_id" integer,
	"escuela_visitante_id" integer,
	"nombre_local_manual" varchar(100),
	"nombre_visitante_manual" varchar(100),
	"goles_local" integer DEFAULT 0,
	"goles_visitante" integer DEFAULT 0,
	"fecha_partido" date,
	"hora" time,
	"estado" "partido_estado" DEFAULT 'programado' NOT NULL,
	"observaciones" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_escuela_id_escuelas_id_fk" FOREIGN KEY ("escuela_id") REFERENCES "public"."escuelas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jugadores" ADD CONSTRAINT "jugadores_escuela_id_escuelas_id_fk" FOREIGN KEY ("escuela_id") REFERENCES "public"."escuelas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jugadores" ADD CONSTRAINT "jugadores_categoria_id_categorias_id_fk" FOREIGN KEY ("categoria_id") REFERENCES "public"."categorias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asistencias" ADD CONSTRAINT "asistencias_jugador_id_jugadores_id_fk" FOREIGN KEY ("jugador_id") REFERENCES "public"."jugadores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_jugador_id_jugadores_id_fk" FOREIGN KEY ("jugador_id") REFERENCES "public"."jugadores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "torneo_participantes" ADD CONSTRAINT "torneo_participantes_torneo_id_torneos_id_fk" FOREIGN KEY ("torneo_id") REFERENCES "public"."torneos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "torneo_participantes" ADD CONSTRAINT "torneo_participantes_escuela_id_escuelas_id_fk" FOREIGN KEY ("escuela_id") REFERENCES "public"."escuelas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partidos" ADD CONSTRAINT "partidos_torneo_id_torneos_id_fk" FOREIGN KEY ("torneo_id") REFERENCES "public"."torneos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partidos" ADD CONSTRAINT "partidos_escuela_local_id_escuelas_id_fk" FOREIGN KEY ("escuela_local_id") REFERENCES "public"."escuelas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partidos" ADD CONSTRAINT "partidos_escuela_visitante_id_escuelas_id_fk" FOREIGN KEY ("escuela_visitante_id") REFERENCES "public"."escuelas"("id") ON DELETE no action ON UPDATE no action;