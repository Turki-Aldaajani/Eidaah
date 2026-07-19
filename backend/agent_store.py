# agent_store.py
# In-memory store for A1 study-agent runs. Each run is layered over an existing
# upload session (see session_store) and holds the agent's plan, per-topic
# progress, and the final report. Runs expire after AGENT_TTL seconds.

import time
import uuid
from dataclasses import dataclass, field
from typing import Optional

AGENT_TTL = 3600  # 1 hour, matches session TTL
MASTERY_THRESHOLD = 0.6  # a topic is "mastered" at >= 60% correct


@dataclass
class TopicProgress:
    topic_id: int
    label: str
    focus: str = ""                              # one-line study focus from the plan
    phase: str = "first_pass"                    # first_pass | remediation
    explanation: str = ""
    example: str = ""
    questions: list = field(default_factory=list)  # current quiz: [{q, o, a, e}]
    attempts: list = field(default_factory=list)   # [{ratio, correct, total, phase}]
    best_ratio: Optional[float] = None
    status: str = "pending"                       # pending | active | mastered | weak

    @property
    def mastered(self) -> bool:
        return self.best_ratio is not None and self.best_ratio >= MASTERY_THRESHOLD


@dataclass
class AgentRun:
    run_id: str
    session_id: str
    goal: str
    language: str
    plan_intro: str = ""
    steps: list = field(default_factory=list)     # ordered list[TopicProgress]
    cursor: int = 0                               # index of the step awaiting answers
    phase: str = "first_pass"                     # first_pass | remediation | complete
    remediation_built: bool = False
    status: str = "planning"                      # planning | awaiting_answers | complete
    report: Optional[dict] = None
    created_at: float = field(default_factory=time.time)

    def current_step(self) -> Optional[TopicProgress]:
        if 0 <= self.cursor < len(self.steps):
            return self.steps[self.cursor]
        return None


# ---------------------
# Store
# ---------------------
_runs: dict = {}


def create_run(session_id: str, goal: str, language: str) -> AgentRun:
    rid = uuid.uuid4().hex[:12]
    run = AgentRun(run_id=rid, session_id=session_id, goal=goal, language=language)
    _runs[rid] = run
    print(f"🧭 Agent run created: {rid} (goal: {goal[:50]!r})")
    return run


def get_run(rid: str) -> Optional[AgentRun]:
    run = _runs.get(rid)
    if run is None:
        return None
    if (time.time() - run.created_at) > AGENT_TTL:
        _runs.pop(rid, None)
        return None
    return run


def cleanup_expired():
    now = time.time()
    expired = [rid for rid, r in _runs.items() if (now - r.created_at) > AGENT_TTL]
    for rid in expired:
        _runs.pop(rid, None)
    if expired:
        print(f"🗑️  Cleaned up {len(expired)} expired agent run(s).")


def active_run_count() -> int:
    return len(_runs)
