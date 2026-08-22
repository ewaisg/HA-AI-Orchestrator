from tests.security.canaries import CANARIES, REDACTED, canary_by_id


def test_canary_ids_and_values_are_unique() -> None:
    assert len({item.id for item in CANARIES}) == len(CANARIES)
    assert len({item.value for item in CANARIES}) == len(CANARIES)


def test_canaries_are_obviously_synthetic() -> None:
    assert all("synthetic" in item.value.lower() for item in CANARIES)
    assert all(item.expected_replacement == REDACTED for item in CANARIES)


def test_canary_scan_variants_are_deterministic() -> None:
    first = canary_by_id("secret.url_userinfo").scan_variants()
    second = canary_by_id("secret.url_userinfo").scan_variants()
    assert first == second
    assert len(first) == 3


def test_unknown_canary_id_is_rejected() -> None:
    try:
        canary_by_id("unknown")
    except KeyError as err:
        assert err.args == ("unknown",)
    else:
        raise AssertionError("Unknown canary ID was accepted")
