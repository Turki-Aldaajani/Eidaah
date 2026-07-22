# concurrency.py
# Shared thread pool for offloading blocking work off the asyncio event loop.
#
# Everything that talks to Groq or parses a PDF/PPTX is blocking and synchronous.
# Calling it directly from an `async def` endpoint stalls the whole server: while
# one student waits on a 5s Groq round-trip, nobody else's request is served.
# Route that work through `run_blocking` instead.

import asyncio
from concurrent.futures import ThreadPoolExecutor

# Groq calls and file parsing are I/O-bound (network / disk), not CPU-bound, so
# threads are the right tool and the pool can be wider than the core count.
# Sized to cover a demo room's worth of concurrent students.
executor = ThreadPoolExecutor(max_workers=16, thread_name_prefix="eidaah")


async def run_blocking(fn, *args, **kwargs):
    """Await a blocking callable on the shared pool, keeping the event loop free."""
    loop = asyncio.get_running_loop()
    if kwargs:
        return await loop.run_in_executor(executor, lambda: fn(*args, **kwargs))
    return await loop.run_in_executor(executor, fn, *args)
