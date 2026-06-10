"""
Unit tests — cart pricing calculations.
No DB or external dependencies. Pure function logic.
"""
import pytest
from app.core.security import hash_password, verify_password


# ─── Security / Auth Unit Tests ───────────────────────────────────────────────
class TestPasswordHashing:
    @pytest.mark.unit
    def test_hash_password_returns_bcrypt_hash(self):
        hashed = hash_password("Test1234!")
        assert hashed.startswith("$2b$")

    @pytest.mark.unit
    def test_verify_correct_password(self):
        hashed = hash_password("Test1234!")
        assert verify_password("Test1234!", hashed) is True

    @pytest.mark.unit
    def test_reject_wrong_password(self):
        hashed = hash_password("Test1234!")
        assert verify_password("WrongPass!", hashed) is False

    @pytest.mark.unit
    def test_same_password_produces_different_hashes(self):
        h1 = hash_password("Test1234!")
        h2 = hash_password("Test1234!")
        assert h1 != h2  # bcrypt uses random salt


# ─── Cart Pricing Unit Tests ──────────────────────────────────────────────────
class TestCartPricing:
    """
    Tests the cart summary calculation logic that mirrors CartStore.getSummary().
    These functions are purely mathematical — no DB needed.
    """

    @staticmethod
    def calculate_summary(items: list[dict], coupon_discount: float = 0.0):
        subtotal = sum(item["price"] * item["qty"] for item in items)
        shipping = 0.0 if subtotal >= 999 else 99.0
        total = subtotal - coupon_discount + shipping
        return {"subtotal": subtotal, "discount": coupon_discount, "shipping": shipping, "total": total}

    @pytest.mark.unit
    def test_subtotal_calculated_correctly(self):
        items = [{"price": 899, "qty": 2}, {"price": 599, "qty": 1}]
        summary = self.calculate_summary(items)
        assert summary["subtotal"] == 2397.0

    @pytest.mark.unit
    def test_free_shipping_above_threshold(self):
        items = [{"price": 999, "qty": 1}]
        summary = self.calculate_summary(items)
        assert summary["shipping"] == 0.0

    @pytest.mark.unit
    def test_shipping_charged_below_threshold(self):
        items = [{"price": 499, "qty": 1}]
        summary = self.calculate_summary(items)
        assert summary["shipping"] == 99.0

    @pytest.mark.unit
    def test_percentage_coupon_applied(self):
        items = [{"price": 1000, "qty": 1}]
        discount = round(1000 * 0.20, 2)  # 20% off
        summary = self.calculate_summary(items, coupon_discount=discount)
        assert summary["discount"] == 200.0
        assert summary["total"] == 800.0  # free shipping since subtotal=1000

    @pytest.mark.unit
    def test_total_equals_subtotal_minus_discount_plus_shipping(self):
        items = [{"price": 500, "qty": 1}]
        discount = 50.0
        summary = self.calculate_summary(items, coupon_discount=discount)
        expected = 500 - 50 + 99  # 549
        assert summary["total"] == expected

    @pytest.mark.unit
    def test_empty_cart_zero_totals(self):
        summary = self.calculate_summary([])
        assert summary["subtotal"] == 0.0
        assert summary["total"] == 99.0  # shipping still applies (below 999)


# ─── Size Recommendation Unit Tests ──────────────────────────────────────────
class TestSizeRecommendation:
    """
    Tests the size recommendation algorithm logic.
    Mirrors the logic in app/routers/ai.py: recommend_size()
    """

    SIZE_CHART = [
        ("XS", 30, 34),
        ("S",  34, 36),
        ("M",  36, 38),
        ("L",  38, 42),
        ("XL", 42, 46),
        ("XXL", 46, 50),
    ]

    def recommend_from_chest(self, chest: float) -> str:
        for size, min_c, max_c in self.SIZE_CHART:
            if min_c <= chest < max_c:
                return size
        return "XXL"

    def confidence_from_measurements(self, count: int) -> float:
        return min(0.95, 0.5 + count * 0.09)

    @pytest.mark.unit
    def test_chest_38_recommends_L(self):
        assert self.recommend_from_chest(38) == "L"

    @pytest.mark.unit
    def test_chest_36_recommends_M(self):
        assert self.recommend_from_chest(36) == "M"

    @pytest.mark.unit
    def test_chest_34_recommends_S(self):
        assert self.recommend_from_chest(34) == "S"

    @pytest.mark.unit
    def test_chest_46_recommends_XXL(self):
        assert self.recommend_from_chest(46) == "XXL"

    @pytest.mark.unit
    def test_high_confidence_with_all_measurements(self):
        # 5 measurements provided
        confidence = self.confidence_from_measurements(5)
        assert confidence >= 0.85

    @pytest.mark.unit
    def test_low_confidence_with_no_measurements(self):
        confidence = self.confidence_from_measurements(0)
        assert confidence == 0.5

    @pytest.mark.unit
    def test_confidence_capped_at_95_percent(self):
        confidence = self.confidence_from_measurements(10)
        assert confidence <= 0.95


# ─── Coupon Validation Unit Tests ────────────────────────────────────────────
class TestCouponValidation:

    @staticmethod
    def apply_coupon(coupon_type: str, value: float, subtotal: float) -> float:
        if coupon_type == "percentage":
            return round(subtotal * (value / 100), 2)
        elif coupon_type == "flat_amount":
            return min(value, subtotal)
        elif coupon_type == "free_shipping":
            return 0.0
        return 0.0

    @pytest.mark.unit
    def test_percentage_20_off(self):
        discount = self.apply_coupon("percentage", 20, 1000)
        assert discount == 200.0

    @pytest.mark.unit
    def test_flat_amount_200_off(self):
        discount = self.apply_coupon("flat_amount", 200, 1000)
        assert discount == 200.0

    @pytest.mark.unit
    def test_flat_amount_cannot_exceed_subtotal(self):
        discount = self.apply_coupon("flat_amount", 2000, 500)
        assert discount == 500.0

    @pytest.mark.unit
    def test_free_shipping_returns_zero(self):
        discount = self.apply_coupon("free_shipping", 0, 800)
        assert discount == 0.0

    @pytest.mark.unit
    def test_unknown_coupon_type_returns_zero(self):
        discount = self.apply_coupon("unknown_type", 50, 1000)
        assert discount == 0.0
