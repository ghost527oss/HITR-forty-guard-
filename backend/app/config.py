"""Application configuration, loaded from environment / .env."""
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "backend/.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_env: str = "development"
    app_name: str = "HITR"

    # FortyGuard Temperature API (Vercel: FORTYGUARD_API_KEY)
    fortyguard_api_key: str = ""

    @field_validator("fortyguard_api_key", mode="before")
    @classmethod
    def _strip_key(cls, v):
        if isinstance(v, str):
            return v.strip().strip('"').strip("'")
        return v or ""
    # Gemini (Google AI Studio)
    gemini_api_key: str = ""

    # Supabase (Postgres + PostGIS knowledge DB). The publishable/anon key is public;
    # the secret/service key is sensitive — keep it in .env, never commit it.
    supabase_url: str = ""
    supabase_publishable_key: str = ""
    supabase_secret_key: str = ""

    # knowledge provider: "auto" (supabase if configured, else seed), "supabase", "seed"
    knowledge_provider: str = "auto"

    @property
    def use_seed_knowledge(self) -> bool:
        """True when we should use the bundled seed data instead of Supabase."""
        if self.knowledge_provider == "supabase":
            return False
        if self.knowledge_provider == "seed":
            return True
        # auto: use seed when no Supabase URL/key is configured
        return not (self.supabase_url and self.supabase_publishable_key)

    # heat provider: "auto" (real if key present, else mock), "real", "mock"
    heat_provider: str = "auto"

    @property
    def use_mock_heat(self) -> bool:
        if self.heat_provider == "real":
            return False
        if self.heat_provider == "mock":
            return True
        # auto: mock when no key
        return not self.fortyguard_api_key


settings = Settings()
