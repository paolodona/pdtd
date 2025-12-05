use jsonwebtoken::{encode, decode, Header, Validation, EncodingKey, DecodingKey};
use serde::{Deserialize, Serialize};
use std::time::{SystemTime, UNIX_EPOCH};

const JWT_SECRET: &[u8] = b"your-secret-key-change-in-production"; // TODO: Use env var

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,  // User ID
    pub exp: u64,     // Expiration time
    pub iat: u64,     // Issued at
}

pub struct AuthState {
    encoding_key: EncodingKey,
    decoding_key: DecodingKey,
}

impl AuthState {
    pub fn new() -> Self {
        Self {
            encoding_key: EncodingKey::from_secret(JWT_SECRET),
            decoding_key: DecodingKey::from_secret(JWT_SECRET),
        }
    }

    pub fn create_token(&self, user_id: &str, expires_in_secs: u64) -> Result<String, jsonwebtoken::errors::Error> {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs();

        let claims = Claims {
            sub: user_id.to_string(),
            exp: now + expires_in_secs,
            iat: now,
        };

        encode(&Header::default(), &claims, &self.encoding_key)
    }

    pub fn verify_token(&self, token: &str) -> Result<Claims, jsonwebtoken::errors::Error> {
        let token_data = decode::<Claims>(token, &self.decoding_key, &Validation::default())?;
        Ok(token_data.claims)
    }
}

impl Default for AuthState {
    fn default() -> Self {
        Self::new()
    }
}
