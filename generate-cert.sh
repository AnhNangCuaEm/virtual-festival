#!/bin/bash

echo "Generating self-signed SSL certificate for local development..."
echo ""

# Check if OpenSSL is available
if ! command -v openssl &> /dev/null; then
    echo "ERROR: OpenSSL is not installed"
    echo ""
    echo "Please install OpenSSL:"
    echo "  - Ubuntu/Debian: sudo apt-get install openssl"
    echo "  - macOS: brew install openssl"
    echo ""
    exit 1
fi

# Generate certificate
openssl req -x509 -newkey rsa:2048 -nodes -sha256 -subj "/CN=localhost" \
    -keyout localhost-key.pem -out localhost-cert.pem -days 365

echo ""
echo "✓ Certificate generated successfully!"
echo "  - localhost-key.pem"
echo "  - localhost-cert.pem"
echo ""
echo "You can now run: npm run dev:https"
echo ""
echo "NOTE: Your browser will show a security warning because this is a self-signed certificate."
echo "Just click 'Advanced' and 'Proceed to localhost' to continue."
echo ""
