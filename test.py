import requests
from urllib.parse import quote

local = requests.get("https://anipub.xyz/v1/api/details/13").json()["local"]

# EP 1 is the top-level link, NOT inside ep[]
ep1 = local["link"].replace("src=", "")
print(f"EP1: {ep1}")

# EP 2, 3, 4... — ep[] array begins at episode 2
for i, ep in enumerate(local["ep"], 2):
    print(f"EP{i}: {ep['link'].replace('src=','')}")



from urllib.parse import quote
results = requests.get(
    f"https://anipub.xyz/api/search/{quote('One Piece')}"
).json()
for r in results:
    print(f"[{r['Id']}] {r['Name']}")