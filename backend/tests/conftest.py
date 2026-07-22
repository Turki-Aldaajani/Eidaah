import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest

from rate_limit import limiter


@pytest.fixture(autouse=True)
def reset_rate_limiter():
    """Give every test a clean quota.

    The limiter keeps counters in process memory keyed by client IP, and the
    whole suite shares one IP ("testclient"). Without this, a test that
    deliberately exhausts the limit would leave every later test throttled —
    and the failures would land in whichever file happened to run next.
    """
    limiter.reset()
    yield
    limiter.reset()
