export async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  if (items.length === 0) {
    return;
  }

  const workerCount = Math.min(
    concurrency,
    items.length,
  );

  let nextIndex = 0;

  async function runWorker(): Promise<void> {
    while (true) {
      const currentIndex = nextIndex++;

      if (currentIndex >= items.length) {
        return;
      }

      try {
        await worker(items[currentIndex]);
      } catch {
        // Individual worker failures must not stop
        // other scheduled items from being processed.
      }
    }
  }

  await Promise.all(
    Array.from(
      { length: workerCount },
      () => runWorker(),
    ),
  );
}