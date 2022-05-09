import json
import math
from random import randint
import time
USERS = ['0a179b1cb19d5e3fccdf', '57d8c0470908d8b35d31']
NUM_MSGS_GEN = 400
def main():
    with open('asd.json', 'r') as f:
        data = json.load(f)
        messages = data['messages']
        id = data['id']
    
    for i in range(0, NUM_MSGS_GEN):
        usr = USERS[randint(0, 1)]
        msg = {
            'id': id,
            'author': usr,
            'message': {
                "content": "This is a message",
                "files": []
            },
            'createdAt': { "$numberLong": str(math.trunc(time.time()) * 1000) },
            'read': list(filter(lambda x: x != usr, USERS)),
            'edited': False,
        }
        id += 1
        messages.append(msg)
    
    data['id'] = id
    data['messages'] = messages

    with open('asd.json', 'w') as f:
        json.dump(data, f)

if __name__ == '__main__':
    main()