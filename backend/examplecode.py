import requests
import base64

url = "https://promptcrafter-user-media.s3.ap-south-1.amazonaws.com/userMedia/16/3374b840-b6c9-4bc7-a18d-0b46abd92936.jpeg"

response = requests.get(url)
image_bytes = response.content

base64_string = base64.b64encode(image_bytes).decode("utf-8")

print("data:image/jpeg;base64," + base64_string)