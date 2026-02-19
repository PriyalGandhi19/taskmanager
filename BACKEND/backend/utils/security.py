import bcrypt
import hashlib

def hash_password(plain: str) -> str:
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(plain.encode("utf-8"), salt)
    return hashed.decode("utf-8")

def verify_password(plain: str, password_hash: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), password_hash.encode("utf-8"))

def hash_token(token: str) -> str:
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(token.encode("utf-8"), salt)
    return hashed.decode("utf-8")

def verify_token(token: str, token_hash: str) -> bool:
    return bcrypt.checkpw(token.encode("utf-8"), token_hash.encode("utf-8"))

def sha256_hex(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()