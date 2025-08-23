# SSH Key Configuration

This directory contains SSH public keys for authentication and deployment.

## Files

- `authorized_keys` - Standard SSH authorized keys format
- `ssh_keys.yml` - YAML configuration with key metadata
- `README.md` - This documentation

## Current Keys

### Blink iPhone
- **Type**: Authentication Key
- **Algorithm**: ssh-ed25519  
- **User**: user@iphone
- **Purpose**: iPhone device authentication
- **Added**: 2024-08-23

## Usage

The SSH keys are used by the deployment system in `tools/deploy.sh`. To verify the configuration:

```bash
./tools/deploy.sh
```

## Adding New Keys

1. Add the public key to `authorized_keys` in standard format:
   ```
   ssh-keytype public-key-data user@hostname
   ```

2. Update `ssh_keys.yml` with key metadata:
   ```yaml
   - title: "Key Name"
     type: "Authentication Key"
     key_type: "ssh-ed25519" 
     public_key: "base64-encoded-key-data"
     user: "user@hostname"
     added_date: "YYYY-MM-DD"
     purpose: "Description of key purpose"
   ```

## Security Notes

- This directory contains only **public** keys (safe to commit to version control)
- Private keys should never be committed to the repository
- Keys are used for authentication and deployment operations
- Regular key rotation is recommended for security