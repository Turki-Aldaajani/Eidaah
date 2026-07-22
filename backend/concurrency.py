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

# C4 video recommendations get their OWN pool, separate from `executor` above.
# One /api/lesson_videos call can chain several sequential HTTP round-trips
# (channel resolution + search + hydrate per approved channel, then a Groq
# relevance call), each with its own timeout -- worst case, a single request
# can tie up a thread for a long time on a slow network. Reproduced live in
# production: once YOUTUBE_API_KEY started doing real work instead of always
# returning empty, a burst of video requests saturated the SHARED pool and
# starved uploads and the AI assistant too, since every blocking endpoint in
# the app used to funnel through the same 16 threads. Keeping video work on
# its own smaller pool means it can never starve the rest of the app again,
# whatever happens to YouTube/Groq latency.
video_executor = ThreadPoolExecutor(max_workers=4, thread_name_prefix="eidaah-video")


async def run_blocking(fn, *args, **kwargs):
    """Await a blocking callable on the shared pool, keeping the event loop free."""
    loop = asyncio.get_running_loop()
    if kwargs:
        return await loop.run_in_executor(executor, lambda: fn(*args, **kwargs))
    return await loop.run_in_executor(executor, fn, *args)
