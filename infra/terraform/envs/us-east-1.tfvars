# Primary region — owns the apex domain (fanfndr.com + www).
# NON-SECRET topology only. Secrets come from TF_VAR_* (GitHub Actions secrets).
region                 = "us-east-1"
root_domain            = "fanfndr.com"
api_subdomain          = "api"
manage_dns             = true
manage_frontend_domain = true
frontend_subdomain     = "" # "" => apex + www

instance_type     = "t2.micro"
root_volume_gb    = 8
enable_origin_tls = true
letsencrypt_email = "you@example.com"              # fill in
supabase_url      = "https://your-ref.supabase.co" # fill in (public value)
admin_emails      = ""                             # optional, comma-separated
