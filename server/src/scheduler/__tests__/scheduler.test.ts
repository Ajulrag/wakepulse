import { describe, expect, it } from "vitest";
import { runWithConcurrency } from "../concurrency.js";

describe("scheduler concurrency", () => {
    it("processes all scheduled items", async () => {
        const items = [1, 2, 3, 4, 5];

        const processed: number[] = [];

        await runWithConcurrency(
            items,
            2,
            async (item) => {
                await new Promise((resolve) =>
                    setTimeout(resolve, 5),
                );

                processed.push(item);
            },
        );

        expect(processed.sort((a, b) => a - b)).toEqual(
            [1, 2, 3, 4, 5],
        );
    });

    it("does not exceed the concurrency limit", async () => {
        const items = Array.from(
            { length: 8 },
            (_, index) => index,
        );

        let activeWorkers = 0;
        let maximumActiveWorkers = 0;

        await runWithConcurrency(
            items,
            2,
            async () => {
                activeWorkers += 1;

                maximumActiveWorkers = Math.max(
                    maximumActiveWorkers,
                    activeWorkers,
                );

                await new Promise((resolve) =>
                    setTimeout(resolve, 10),
                );

                activeWorkers -= 1;
            },
        );

        expect(maximumActiveWorkers).toBeLessThanOrEqual(2);
    });

    it("handles an empty list", async () => {
        let executed = false;

        await runWithConcurrency(
            [],
            5,
            async () => {
                executed = true;
            },
        );

        expect(executed).toBe(false);
    });

    it("does not create more workers than available items", async () => {
        const items = [1, 2];

        let activeWorkers = 0;
        let maximumActiveWorkers = 0;

        await runWithConcurrency(
            items,
            10,
            async () => {
                activeWorkers += 1;

                maximumActiveWorkers = Math.max(
                    maximumActiveWorkers,
                    activeWorkers,
                );

                await new Promise((resolve) =>
                    setTimeout(resolve, 10),
                );

                activeWorkers -= 1;
            },
        );

        expect(maximumActiveWorkers).toBeLessThanOrEqual(2);
    });

    it("continues processing when one worker fails", async () => {
        const items = [1, 2, 3, 4];

        const processed: number[] = [];

        await runWithConcurrency(
            items,
            2,
            async (item) => {
                processed.push(item);

                if (item === 2) {
                    throw new Error("Simulated worker failure");
                }
            },
        );

        expect(
            processed.sort((a, b) => a - b),
        ).toEqual([1, 2, 3, 4]);
    });
});