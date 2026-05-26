import os
from datetime import datetime
from sqlalchemy import (
    Boolean, Column, DateTime, ForeignKey, Integer, String, Text, create_engine, text
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./resumeai.db")

# Railway PostgreSQL URLs use postgres:// but SQLAlchemy requires postgresql://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {},
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class Recruiter(Base):
    __tablename__ = "recruiters"
    id                 = Column(Integer, primary_key=True, autoincrement=True)
    name               = Column(String, nullable=False)
    email              = Column(String, unique=True, nullable=False, index=True)
    created_at         = Column(DateTime, default=datetime.utcnow)
    is_admin           = Column(Boolean, default=False)
    role               = Column(String, default='recruiter')
    team_manager_email = Column(String, nullable=True)
    status             = Column(String, default='active')
    invited_by         = Column(String, nullable=True)
    invited_at         = Column(DateTime, nullable=True)


class Invitation(Base):
    __tablename__ = "invitations"
    id                 = Column(Integer, primary_key=True, autoincrement=True)
    email              = Column(String, unique=True, nullable=False)
    name               = Column(String, nullable=True)
    role               = Column(String, default='recruiter')
    invited_by         = Column(String, nullable=False)
    team_manager_email = Column(String, nullable=True)
    token              = Column(String, unique=True, nullable=False)
    status             = Column(String, default='pending')
    created_at         = Column(DateTime, default=datetime.utcnow)
    accepted_at        = Column(DateTime, nullable=True)


class OTPCode(Base):
    __tablename__ = "otp_codes"
    id         = Column(Integer, primary_key=True, autoincrement=True)
    email      = Column(String, nullable=False)
    code       = Column(String(6), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)
    used       = Column(Boolean, default=False)


class Project(Base):
    __tablename__ = "projects"
    id                    = Column(Integer, primary_key=True, autoincrement=True)
    name                  = Column(String, nullable=False)
    client_name           = Column(String, nullable=True)
    jd_text               = Column(Text, nullable=True)
    jd_context            = Column(Text, nullable=True)
    required_location     = Column(String, nullable=True)
    keywords              = Column(Text, nullable=True)
    benchmark_fingerprint = Column(Text, nullable=True)
    created_by_email      = Column(String, nullable=False)
    created_at            = Column(DateTime, default=datetime.utcnow)
    candidates            = relationship("Candidate", back_populates="project", cascade="all, delete-orphan")


class Candidate(Base):
    __tablename__ = "candidates"
    id          = Column(Integer, primary_key=True, autoincrement=True)
    project_id  = Column(Integer, ForeignKey("projects.id"), nullable=False)
    name        = Column(String)
    filename    = Column(String)
    score       = Column(Integer)
    result_json = Column(Text)
    status             = Column(String, default='pending')
    remark             = Column(Text, nullable=True)
    linkedin_url       = Column(Text, nullable=True)
    linkedin_text      = Column(Text, nullable=True)
    benchmark_match_percent = Column(Integer, nullable=True)
    benchmark_similarities  = Column(Text, nullable=True)
    benchmark_differences   = Column(Text, nullable=True)
    benchmark_verdict       = Column(Text, nullable=True)
    candidate_phone    = Column(Text, nullable=True)
    is_duplicate       = Column(Boolean, default=False, nullable=True)
    duplicate_projects = Column(Text, nullable=True)
    pipeline_stage     = Column(String, default='screened', nullable=True)
    uploaded_at        = Column(DateTime, default=datetime.utcnow)
    project            = relationship("Project", back_populates="candidates")


class DailyContent(Base):
    __tablename__ = "daily_content"
    id             = Column(Integer, primary_key=True, autoincrement=True)
    date           = Column(String, unique=True, nullable=False, index=True)
    quote          = Column(Text, nullable=False)
    quote_author   = Column(String, nullable=False)
    quote_category = Column(String, nullable=False)
    trivia         = Column(Text, nullable=False)
    generated_at   = Column(DateTime, default=datetime.utcnow)


class DailyGame(Base):
    __tablename__ = "daily_games"
    id         = Column(Integer, primary_key=True, autoincrement=True)
    game_type  = Column(String, nullable=False)
    game_date  = Column(String, nullable=False)
    content    = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class GameResult(Base):
    __tablename__ = "game_results"
    id              = Column(Integer, primary_key=True, autoincrement=True)
    recruiter_email = Column(String, nullable=False)
    game_type       = Column(String, nullable=False)
    game_date       = Column(String, nullable=False)
    score           = Column(Integer, default=0)
    completed       = Column(Boolean, default=False)
    time_taken      = Column(Integer, default=0)
    played_at       = Column(DateTime, default=datetime.utcnow)


class Streak(Base):
    __tablename__ = "streaks"
    id               = Column(Integer, primary_key=True, autoincrement=True)
    recruiter_email  = Column(String, unique=True, nullable=False)
    current_streak   = Column(Integer, default=0)
    longest_streak   = Column(Integer, default=0)
    last_played_date = Column(String, nullable=True)
    total_games      = Column(Integer, default=0)


class CandidateFeedback(Base):
    __tablename__ = "candidate_feedback"
    id              = Column(Integer, primary_key=True, autoincrement=True)
    candidate_id    = Column(Integer, nullable=False)
    project_id      = Column(Integer, nullable=False)
    recruiter_email = Column(String, nullable=False)
    action          = Column(String, nullable=False)
    reason          = Column(String, nullable=False)
    reason_detail   = Column(Text, nullable=True)
    created_at      = Column(DateTime, default=datetime.utcnow)


class ClientLearning(Base):
    __tablename__ = "client_learning"
    id            = Column(Integer, primary_key=True, autoincrement=True)
    client_name   = Column(String, nullable=False)
    learning_type = Column(String, nullable=False)
    learning_text = Column(Text, nullable=False)
    confidence    = Column(Integer, default=1)
    created_at    = Column(DateTime, default=datetime.utcnow)
    updated_at    = Column(DateTime, default=datetime.utcnow)


class FeatureUsage(Base):
    __tablename__ = "feature_usage"
    id              = Column(Integer, primary_key=True, autoincrement=True)
    recruiter_email = Column(String, nullable=False)
    feature_name    = Column(String, nullable=False)
    used_at         = Column(DateTime, default=datetime.utcnow)


class MonthlySurvey(Base):
    __tablename__ = "monthly_survey"
    id              = Column(Integer, primary_key=True, autoincrement=True)
    recruiter_email = Column(String, nullable=False)
    month           = Column(String, nullable=False)
    q1_rating       = Column(Integer, nullable=True)
    q2_rating       = Column(Integer, nullable=True)
    q3_text         = Column(Text, nullable=True)
    completed_at    = Column(DateTime, default=datetime.utcnow)


def create_tables():
    Base.metadata.create_all(bind=engine)
    with engine.connect() as conn:
        for col_sql in [
            "ALTER TABLE candidates ADD COLUMN remark TEXT",
            "ALTER TABLE candidates ADD COLUMN linkedin_url TEXT",
            "ALTER TABLE candidates ADD COLUMN linkedin_text TEXT",
            "ALTER TABLE recruiters ADD COLUMN is_admin BOOLEAN DEFAULT 0",
            "ALTER TABLE candidates ADD COLUMN status TEXT DEFAULT 'pending'",
            "ALTER TABLE projects ADD COLUMN benchmark_fingerprint TEXT",
            "ALTER TABLE candidates ADD COLUMN benchmark_match_percent INTEGER",
            "ALTER TABLE candidates ADD COLUMN benchmark_similarities TEXT",
            "ALTER TABLE candidates ADD COLUMN benchmark_differences TEXT",
            "ALTER TABLE candidates ADD COLUMN benchmark_verdict TEXT",
            "ALTER TABLE candidates ADD COLUMN candidate_phone TEXT",
            "ALTER TABLE candidates ADD COLUMN is_duplicate BOOLEAN DEFAULT 0",
            "ALTER TABLE candidates ADD COLUMN duplicate_projects TEXT",
            "ALTER TABLE candidates ADD COLUMN pipeline_stage TEXT DEFAULT 'screened'",
            "ALTER TABLE recruiters ADD COLUMN role TEXT DEFAULT 'recruiter'",
            "ALTER TABLE recruiters ADD COLUMN team_manager_email TEXT",
            "ALTER TABLE recruiters ADD COLUMN status TEXT DEFAULT 'active'",
            "ALTER TABLE recruiters ADD COLUMN invited_by TEXT",
            "ALTER TABLE recruiters ADD COLUMN invited_at DATETIME",
            "ALTER TABLE game_results ADD COLUMN time_taken INTEGER DEFAULT 0",
            "ALTER TABLE monthly_survey ADD COLUMN q1_rating INTEGER",
            "ALTER TABLE monthly_survey ADD COLUMN q2_rating INTEGER",
            "ALTER TABLE monthly_survey ADD COLUMN q3_text TEXT",
        ]:
            try:
                conn.execute(text(col_sql))
                conn.commit()
            except Exception:
                pass  # column already exists
