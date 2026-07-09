# Secondary region example — full stack replica in us-west-2.
# The apex stays with the primary region; this frontend gets west.fanfndr.com
# and the API gets api-west.fanfndr.com. Copy this file to add more regions.
region                 = "us-west-2"
root_domain            = "fanfndr.com"
api_subdomain          = "api-west"
manage_dns             = true
manage_frontend_domain = true
frontend_subdomain     = "west" # => west.fanfndr.com

instance_type     = "t2.micro"
root_volume_gb    = 8
enable_origin_tls = true
letsencrypt_email = "you@example.com"
# Point at a Supabase project in (or near) this region, or reuse the primary's.
supabase_url = "https://your-ref.supabase.co"
admin_emails = ""
