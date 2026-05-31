import urllib.request, json, sys

with urllib.request.urlopen("http://localhost:8000/openapi.json") as resp:
    d = json.loads(resp.read())

auth_paths = [p for p in d["paths"] if "auth" in p]
print("Auth endpoints registered:")
for p in auth_paths:
    methods = list(d["paths"][p].keys())
    print(f"  {methods[0].upper()} {p}")

# Verify GoogleLoginRequest schema exists
if "GoogleLoginRequest" in d.get("components", {}).get("schemas", {}):
    schema = d["components"]["schemas"]["GoogleLoginRequest"]
    print(f"\nGoogleLoginRequest schema: {json.dumps(schema, indent=2)}")
else:
    print("\nWARNING: GoogleLoginRequest schema NOT found")
