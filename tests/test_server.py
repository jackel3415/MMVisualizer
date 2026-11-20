import importlib.util
import pathlib
import socket
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("server", pathlib.Path(__file__).resolve().parents[1] / "serve.py")
server = importlib.util.module_from_spec(spec)
spec.loader.exec_module(server)


class FeedURLTests(unittest.TestCase):
    def test_public_feed_accepted(self):
        with patch.object(socket, "getaddrinfo", return_value=[(2, 1, 6, "", ("93.184.216.34", 443))]):
            self.assertEqual(server.public_url("https://example.com/cal.ics"), "https://example.com/cal.ics")

    def test_private_and_local_addresses_rejected(self):
        for address in ("127.0.0.1", "192.168.1.1", "169.254.169.254", "::1"):
            with self.subTest(address=address), patch.object(socket, "getaddrinfo", return_value=[(2, 1, 6, "", (address, 443))]):
                with self.assertRaises(ValueError):
                    server.public_url("https://example.com/cal.ics")

    def test_credentials_protocol_and_port_rejected(self):
        for url in ("file:///etc/passwd", "http://user:password@example.com/a", "https://example.com:8123/calendar"):
            with self.subTest(url=url), self.assertRaises(ValueError):
                server.public_url(url)


if __name__ == "__main__":
    unittest.main()
