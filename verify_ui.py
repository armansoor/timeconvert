import os
from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Load the file
        cwd = os.getcwd()
        url = f"file://{cwd}/index.html"
        print(f"Loading {url}")
        page.goto(url)

        # Wait for clocks to render
        page.wait_for_selector('.clock-card')

        # Screenshot 1: Dark Mode (Default)
        page.screenshot(path="verification_dark.png", full_page=True)
        print("Screenshot verification_dark.png taken")

        # Toggle Theme
        page.click('#theme-toggle')
        # Wait a bit for transition
        page.wait_for_timeout(500)

        # Screenshot 2: Light Mode
        page.screenshot(path="verification_light.png", full_page=True)
        print("Screenshot verification_light.png taken")

        # Toggle 12h/24h
        # Click the span sibling of the checkbox
        page.locator('#format-toggle + .slider-switch').click()
        page.wait_for_timeout(500)

        # Screenshot 3: 12h Mode
        page.screenshot(path="verification_12h.png", full_page=True)
        print("Screenshot verification_12h.png taken")

        # Drag and Drop
        # Drag first clock to second position
        cards = page.locator('.clock-card')
        src = cards.nth(0)
        tgt = cards.nth(1)

        src_text = src.locator('.card-title').text_content()
        tgt_text = tgt.locator('.card-title').text_content()
        print(f"Dragging {src_text} to {tgt_text}")

        # For HTML5 drag and drop, playwright drag_to works if elements are visible
        src.drag_to(tgt)
        page.wait_for_timeout(1000)

        # Screenshot 4: Reordered
        page.screenshot(path="verification_reordered.png", full_page=True)
        print("Screenshot verification_reordered.png taken")

        browser.close()

if __name__ == "__main__":
    run()
