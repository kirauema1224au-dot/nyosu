import { test, expect } from "@playwright/test"

const captions = {
  title: "fixture",
  lines: [
    {
      text: "line1",
      romaji: "a",
      startMs: 5000,
      endMs: 8000,
    },
  ],
}

test.describe("SuddenDeath intro skip", () => {
  test.beforeEach(async ({ page }) => {
    // Mock API responses
    await page.route("**/api/sudden-death/list", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([{ videoId: "vid1", title: "seed", hasLyrics: true }]),
      }),
    )
    await page.route("**/api/sudden-death/captions?**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(captions),
      }),
    )

    // Stub YouTube IFrame API
    await page.route("https://www.youtube.com/iframe_api", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/javascript",
        body: `
          (function() {
            window.YT = {
              Player: function(id, { events }) {
                const player = {
                  _time: 0,
                  getDuration: () => 120,
                  getCurrentTime: () => player._time,
                  setVolume: () => {},
                  unMute: () => {},
                  playVideo: () => {
                    player._time += 0.01;
                    events.onStateChange?.({ data: 1, target: player });
                  },
                  pauseVideo: () => events.onStateChange?.({ data: 2, target: player }),
                  seekTo: (t) => { player._time = t; window.__lastSeek = t; },
                  loadVideoById: () => {},
                  destroy: () => {},
                };
                setTimeout(() => events.onReady?.({ target: player }), 0);
                return player;
              },
            };
            window.onYouTubeIframeAPIReady?.();
          })();
        `,
      }),
    )
  })

  test("Space triggers countdown then play from first line", async ({ page }) => {
    await page.goto("http://localhost:5173/#sudden-death")

    await page.getByText("これで遊ぶ").click()
    await page.getByText("READY...WAITING").waitFor({ timeout: 5000 })

    await page.keyboard.press(" ")

    await page.getByText("COUNTDOWN").waitFor({ timeout: 2000 })
    await expect(page.getByText("COUNTDOWN")).toBeVisible()

    await page.waitForTimeout(3800)
    await expect(page.getByText("BEAT TYPE RUSH")).toBeVisible()

    const seeked = await page.evaluate(() => (window as any).__lastSeek)
    expect(seeked).toBeCloseTo(5, 0)
  })
})
