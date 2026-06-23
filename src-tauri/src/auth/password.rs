use sha2::{Digest, Sha256};

/// Matches client `hashPassword` in `src/lib/offline/auth.ts` (SHA-256 hex).
pub fn hash_password(password: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(password.as_bytes());
    format!("{:x}", hasher.finalize())
}

pub fn verify_password(password: &str, stored_hash: &str) -> bool {
    hash_password(password) == stored_hash
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn known_hash() {
        assert_eq!(
            hash_password("test"),
            "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08"
        );
    }
}
