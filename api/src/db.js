import pg from 'pg';

// pg devuelve NUMERIC como texto; los precios se usan en cuentas.
pg.types.setTypeParser(pg.types.builtins.NUMERIC, Number);
// DATE queda como 'YYYY-MM-DD': convertirlo a Date lo correria de dia por la zona horaria.
pg.types.setTypeParser(pg.types.builtins.DATE, (valor) => valor);

export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
