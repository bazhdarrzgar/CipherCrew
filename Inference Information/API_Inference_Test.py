import urllib.request
import uuid

filepath = r'C:\Users\dutta\OneDrive\Documents\Tezhack\Dataset collection\Sample_Datasets\Asian_Fruits_Dataset\Fruits Grade\Fruit grade\Apple\1st grade\IMG_20230930_172415.jpg'
filename = 'test_apple.jpg'

boundary = '----WebKitFormBoundary' + uuid.uuid4().hex
with open(filepath, 'rb') as f:
    filedata = f.read()

body = (
    f'--{boundary}\r\n'
    f'Content-Disposition: form-data; name="file"; filename="{filename}"\r\n'
    f'Content-Type: image/jpeg\r\n\r\n'
).encode('utf-8') + filedata + f'\r\n--{boundary}--\r\n'.encode('utf-8')

req = urllib.request.Request('http://107.22.221.241', data=body)
req.add_header('Content-Type', f'multipart/form-data; boundary={boundary}')
req.add_header('User-Agent', 'Mozilla/5.0')

try:
    with urllib.request.urlopen(req, timeout=15) as resp:
        html = resp.read().decode('utf-8')
        print('STATUS:', resp.status)
        print('HTML:\n', html)
except Exception as e:
    print('ERR:', e)
