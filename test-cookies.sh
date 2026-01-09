#!/bin/bash

echo "=== Cookie Authentication Diagnostic ==="
echo ""

echo "1. Testing sign-in endpoint locally..."
echo ""

# Test sign-in and capture response
curl -X POST http://localhost:3000/api/auth/sign_in \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=testuser&password=TestPassword123" \
  -c /tmp/cookies.txt \
  -v 2>&1 | grep -E "(< Set-Cookie|< HTTP|Sign in successful)"

echo ""
echo "=== Cookies saved to /tmp/cookies.txt ==="
cat /tmp/cookies.txt

echo ""
echo "=== Testing authenticated endpoint ==="
curl http://localhost:3000/api/users/me \
  -b /tmp/cookies.txt \
  -v 2>&1 | grep -E "(> Cookie|< HTTP)"

echo ""
echo "=== Troubleshooting Checklist ==="
echo "1. Check if Set-Cookie headers appear above"
echo "2. Check if cookies contain 'HttpOnly', 'SameSite=Lax'"  
echo "3. In production, check if 'Secure' flag is present"
echo "4. Open browser DevTools → Application → Cookies"
echo "5. Look for access_token and refresh_token"
echo ""
