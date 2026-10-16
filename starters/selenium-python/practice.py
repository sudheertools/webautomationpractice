"""
LocatorLab — Selenium 4 (Python) starter suite.

Covers: form essentials, a custom dropdown, the combobox, the registration
flow, the multi-step wizard, tabs, the modal, toasts and the data table.

    pip install selenium
    python practice.py

Set BASE_URL if you are not serving on http://localhost:4173
"""
import os
import re
import time

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import Select, WebDriverWait

BASE_URL = os.environ.get("BASE_URL", "http://localhost:4173")

driver = None
wait = None
passed = 0


def check(name, condition):
    global passed
    assert condition, "FAILED: " + name
    passed += 1
    print("  \u2713 " + name)


def go(path):
    driver.get(BASE_URL + path)
    WebDriverWait(driver, 5).until(lambda d: d.execute_script("return document.readyState") == "complete")


def el(locator):
    return wait.until(EC.presence_of_element_located(locator))


def visible(locator):
    return wait.until(EC.visibility_of_element_located(locator))


def clickable(locator):
    return wait.until(EC.element_to_be_clickable(locator))


# ---------------------------------------------------------------- setup
options = Options()
options.add_argument("--start-maximized")
# options.add_argument("--headless=new")   # uncomment for CI
driver = webdriver.Chrome(options=options)
driver.set_page_load_timeout(20)
wait = WebDriverWait(driver, 10)

try:
    # ================================================ 1. Form essentials
    print("\n[1] Form essentials")
    go("/pages/form-essentials.html")

    # Locators by id, by name and by data-testid all work — pick your poison.
    first = el((By.ID, "first-name"))
    first.send_keys("Ada")
    el((By.NAME, "lastName")).send_keys("Lovelace")
    el((By.CSS_SELECTOR, "[data-testid='user-email']")).send_keys("ada@example.com")

    check("first name value is Ada", first.get_attribute("value") == "Ada")
    check("last name value is Lovelace", el((By.ID, "last-name")).get_attribute("value") == "Lovelace")

    # Label-based XPath proves the <label for> wiring is correct.
    by_label = driver.find_element(
        By.XPATH, "//label[normalize-space()='First name']/following::input[1]"
    )
    check("label XPath resolves to the same input", by_label.get_attribute("id") == "first-name")

    # Checkbox group + indeterminate master
    el((By.ID, "select-all-modules")).click()
    modules = driver.find_elements(By.CSS_SELECTOR, ".module-cb")
    check("select-all checks 5 modules", len(modules) == 5 and all(m.is_selected() for m in modules))

    driver.find_element(By.ID, "mod-alerts").click()
    indeterminate = driver.find_element(By.ID, "select-all-modules").execute_script(
        "return arguments[0].indeterminate", driver.find_element(By.ID, "select-all-modules")
    )
    check("master is indeterminate after unchecking one child", indeterminate is True)

    # Native select by visible text and by value
    country = Select(driver.find_element(By.ID, "country-select"))
    country.select_by_visible_text("India")
    check("country select value is 'in'", country.first_selected_option.get_attribute("value") == "in")

    # Multi-select
    skills = Select(driver.find_element(By.ID, "skills-select"))
    skills.select_by_value("xpath")
    skills.select_by_value("waits")
    check("2 skills selected", len(skills.all_selected_options) == 2)

    # Custom (non-native) dropdown: click button, then click the option.
    clickable((By.ID, "priority-btn")).click()
    visible((By.ID, "priority-menu"))
    driver.find_element(By.ID, "priority-high").click()
    check("custom dropdown label updated", "High" in driver.find_element(By.ID, "priority-btn").text)

    # Searchable combobox / typeahead
    combo = el((By.ID, "language-combo-input"))
    combo.click()
    combo.send_keys("pyth")
    opts = visible((By.ID, "language-combo-list"))
    first_opt = opts.find_element(By.CSS_SELECTOR, ".combo-opt")
    check("typeahead filtered to Python", "python" in first_opt.text.lower())
    first_opt.click()
    check("combobox input filled", combo.get_attribute("value") == "Python")

    # Tag input
    tag = el((By.ID, "tag-input-field"))
    tag.click()
    tag.send_keys("Cypress")
    tag.send_keys(Keys.ENTER)
    check("tag chip added", driver.find_elements(By.CSS_SELECTOR, "#tag-wrap .chip").__len__() == 3)

    # ================================================ 2. Validation
    print("\n[2] Form validation")
    driver.find_element(By.ID, "validate-submit").click()
    visible((By.ID, "val-email-error"))
    check("4 invalid fields after empty submit",
          len(driver.find_elements(By.CSS_SELECTOR, "#validation-form .field.invalid")) == 4)

    # ================================================ 3. Registration
    print("\n[3] Registration flow")
    go("/pages/wizard-submit.html")

    driver.find_element(By.ID, "reg-name").send_keys("Ada Lovelace")
    driver.find_element(By.ID, "reg-email").send_keys("ada@example.com")
    driver.find_element(By.ID, "reg-phone").send_keys("9876543210")
    driver.find_element(By.ID, "reg-dob").send_keys("1990-12-10")
    Select(driver.find_element(By.ID, "reg-country")).select_by_value("in")
    driver.find_element(By.ID, "reg-password").send_keys("Secret123")
    driver.find_element(By.ID, "reg-terms").click()

    driver.find_element(By.ID, "reg-submit").click()
    visible((By.ID, "reg-result-ok"))
    account_id = driver.find_element(By.ID, "reg-account-id").text
    check("account id matches ACC-######", bool(re.match(r"^ACC-\d{6}$", account_id)))

    # ================================================ 4. OTP
    print("\n[4] OTP row")
    for i, digit in enumerate("482913", start=1):
        driver.find_element(By.ID, "otp-%d" % i).send_keys(digit)
    check("OTP mirror field holds the code",
          driver.find_element(By.ID, "otp-value").get_attribute("value") == "482913")
    driver.find_element(By.ID, "otp-verify").click()
    visible_text = wait.until(lambda d: "verified" in d.find_element(By.ID, "otp-status").text.lower())
    check("OTP verified", bool(visible_text))

    # ================================================ 5. Wizard
    print("\n[5] Multi-step wizard")
    driver.find_element(By.ID, "wiz-first").send_keys("Ada")
    driver.find_element(By.ID, "wiz-last").send_keys("Lovelace")
    driver.find_element(By.ID, "wiz-email").send_keys("ada@example.com")
    driver.find_element(By.ID, "wiz-phone").send_keys("9876543210")
    driver.find_element(By.ID, "wiz-next").click()

    visible((By.ID, "wiz-street")).send_keys("12 Analytical Row")
    driver.find_element(By.ID, "wiz-city").send_keys("Bengaluru")
    driver.find_element(By.ID, "wiz-zip").send_keys("560001")
    Select(driver.find_element(By.ID, "wiz-state")).select_by_value("KA")
    driver.find_element(By.ID, "wiz-next").click()

    driver.find_element(By.ID, "wiz-pm-upi").click()
    check("card fields hidden when UPI selected",
          driver.find_element(By.ID, "wiz-card").is_displayed() is False)
    driver.find_element(By.ID, "wiz-next").click()

    check("review echoes the email",
          "ada@example.com" in driver.find_element(By.CSS_SELECTOR, '[data-review="email"]').text)
    driver.find_element(By.ID, "wiz-confirm").click()
    driver.find_element(By.ID, "wiz-place").click()
    visible((By.ID, "wiz-done"))
    order_id = wait.until(lambda d: d.find_element(By.ID, "wiz-order-id").text)
    check("order id matches ORD-#####", bool(re.match(r"^ORD-\d{5}$", order_id)))

    # ================================================ 6. Behaviors
    print("\n[6] Tabs, modal, toasts, table")
    go("/pages/behaviors.html")

    driver.find_element(By.ID, "tab-features").click()
    check("features panel visible", driver.find_element(By.ID, "panel-features").is_displayed())
    check("overview panel hidden", driver.find_element(By.ID, "panel-overview").is_displayed() is False)
    check("disabled tab is not enabled", driver.find_element(By.ID, "tab-disabled").is_enabled() is False)

    driver.find_element(By.ID, "acc-2").click()
    check("accordion panel 2 opened", driver.find_element(By.ID, "acc-panel-2").is_displayed())

    driver.find_element(By.ID, "open-modal").click()
    visible((By.ID, "modal-email")).send_keys("peer@company.com")
    driver.find_element(By.ID, "modal-send").click()
    wait.until(EC.invisibility_of_element_located((By.ID, "modal-backdrop")))
    check("modal closed after submit", True)

    driver.find_element(By.ID, "toast-success").click()
    visible((By.CSS_SELECTOR, ".toast.success"))
    check("success toast appeared", True)
    wait.until(EC.invisibility_of_element_located((By.CSS_SELECTOR, ".toast.success")))
    check("success toast auto-dismissed", True)

    search = el((By.ID, "table-search"))
    search.send_keys("jane")
    time.sleep(0.3)
    rows = driver.find_elements(By.CSS_SELECTOR, "#table-body tr")
    check("search filtered the table to 1 row", len(rows) == 1)

    driver.find_element(By.ID, "table-reset").click()
    driver.find_element(By.ID, "th-name").click()
    time.sleep(0.2)
    first_name = driver.find_elements(By.CSS_SELECTOR, "#table-body tr")[0].find_elements(By.TAG_NAME, "td")[1].text
    check("sorted by name ascending", first_name == "Aisha Khan")

    # ================================================ 7. Waits
    print("\n[7] Explicit waits on dynamic content")
    Select(driver.find_element(By.ID, "delay-select")).select_by_value("1")
    driver.find_element(By.ID, "delay-load").click()
    visible((By.ID, "delayed-card"))
    check("delayed card appeared", True)

    wait.until(EC.visibility_of_element_located((By.ID, "flaky-btn")))
    driver.find_element(By.ID, "flaky-btn").click()
    check("flaky button clicked", driver.find_element(By.ID, "flaky-status").text == "Clicked!")

    wait.until(lambda d: d.find_element(By.ID, "cycle-text").text == "Ready")
    check("waited for exact text 'Ready'", True)
    driver.find_element(By.ID, "cycle-btn").click()

    # ================================================ 8. Frames
    print("\n[8] iFrames")
    driver.switch_to.frame("single-frame")
    driver.find_element(By.ID, "frame-input").send_keys("Hello")
    driver.find_element(By.ID, "frame-echo").click()
    check("value echoed inside the frame", "Hello" in driver.find_element(By.ID, "frame-msg").text)
    driver.switch_to.default_content()

    driver.switch_to.frame("nested-host")
    driver.switch_to.frame("nested-frame")
    check("nested frame input reachable", driver.find_element(By.ID, "frame-input").is_displayed())
    driver.switch_to.default_content()

    print("\n========================================")
    print("  %d assertions passed" % passed)
    print("========================================")

finally:
    time.sleep(1.5)
    driver.quit()
