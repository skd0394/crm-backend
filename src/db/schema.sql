CREATE TABLE IF NOT EXISTS employees (
  id            SERIAL PRIMARY KEY,
  name          TEXT        NOT NULL,
  email         TEXT        NOT NULL UNIQUE,
  password_hash TEXT        NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS enquiries (
  id              SERIAL PRIMARY KEY,
  name            TEXT        NOT NULL,
  email           TEXT        NOT NULL,
  phone           TEXT,
  course_interest TEXT        NOT NULL,
  message         TEXT,
  -- NULL = public (unclaimed); set = private to that counselor
  claimed_by      INTEGER     REFERENCES employees(id) ON DELETE SET NULL,
  claimed_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS enquiries_unclaimed_idx ON enquiries (created_at DESC) WHERE claimed_by IS NULL;
CREATE INDEX IF NOT EXISTS enquiries_claimed_by_idx ON enquiries (claimed_by);
