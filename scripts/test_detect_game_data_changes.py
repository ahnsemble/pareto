import contextlib
import io
import json
import sys
import unittest
from unittest import mock

import detect_game_data_changes as detector


class DetectGameDataChangesTest(unittest.TestCase):
    def test_live_fetch_errors_are_reported_as_json_rows(self):
        source = {
            "id": "missing",
            "url": "https://example.invalid/missing.json",
            "baseline_hash": "baseline",
        }

        class HTTPError(Exception):
            pass

        def raise_http_error(url: str, timeout: float) -> str:
            raise HTTPError("HTTP Error 404: Not Found")

        stdout = io.StringIO()
        with (
            mock.patch.object(detector, "load_sources", return_value=[source]),
            mock.patch.object(detector, "fetch_hash", side_effect=raise_http_error),
            mock.patch.object(sys, "argv", ["detect_game_data_changes.py", "--timeout", "1"]),
            contextlib.redirect_stdout(stdout),
        ):
            exit_code = detector.main()

        payload = json.loads(stdout.getvalue())
        self.assertEqual(exit_code, 1)
        self.assertEqual(payload["source_count"], 1)
        self.assertEqual(payload["rows"][0]["id"], "missing")
        self.assertIsNone(payload["rows"][0]["current_hash"])
        self.assertTrue(payload["rows"][0]["changed"])
        self.assertEqual(payload["rows"][0]["error_type"], "HTTPError")
        self.assertIn("HTTP Error 404", payload["rows"][0]["error"])


if __name__ == "__main__":
    unittest.main()
