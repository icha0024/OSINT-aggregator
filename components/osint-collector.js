// CORS-Friendly OSINT Intelligence Collector
class OSINTCollector {
    constructor() {
        this.cache = new Map();
        this.rateLimits = new Map();
        this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
        
        // CORS-friendly data sources
        this.dataSources = {
            certificateTransparency: 'https://crt.sh/?q=%DOMAIN%&output=json',
            dnsOverHttps: 'https://cloudflare-dns.com/dns-query',
            ipGeolocation: 'https://ipinfo.io/%IP%/json'
        };
    }

    // Real certificate transparency lookup (CORS-friendly)
    async getCertificateData(domain) {
        try {
            const url = this.dataSources.certificateTransparency.replace('%DOMAIN%', encodeURIComponent(domain));
            const response = await this.fetchWithRetry(url);
            
            if (!response.ok) {
                throw new Error(`CT lookup failed: ${response.status}`);
            }
            
            const certificates = await response.json();
            
            if (!certificates || certificates.length === 0) {
                return { found: false, domain: domain, message: 'No certificates found in CT logs' };
            }
            
            // Extract unique subdomains from certificates
            const subdomains = new Set();
            const issuers = new Set();
            
            certificates.forEach(cert => {
                if (cert.name_value) {
                    cert.name_value.split('\n').forEach(name => {
                        name = name.trim();
                        if (name.includes(domain) && name !== domain) {
                            subdomains.add(name);
                        }
                    });
                }
                if (cert.issuer_name) {
                    issuers.add(cert.issuer_name);
                }
            });
            
            return {
                found: true,
                domain: domain,
                totalCertificates: certificates.length,
                subdomains: Array.from(subdomains).slice(0, 50),
                issuers: Array.from(issuers),
                certificates: certificates.slice(0, 10).map(cert => ({
                    issuer: cert.issuer_name,
                    subject: cert.name_value,
                    notBefore: cert.not_before,
                    notAfter: cert.not_after,
                    serialNumber: cert.serial_number
                })),
                collectionMethod: 'Certificate Transparency Logs'
            };
            
        } catch (error) {
            console.error('Certificate transparency lookup failed:', error);
            return { found: false, domain: domain, error: error.message };
        }
    }

    // Real DNS record lookup via DNS-over-HTTPS (CORS-friendly)
    async getDNSRecords(domain) {
        const recordTypes = ['A', 'AAAA', 'MX', 'NS', 'TXT', 'CNAME'];
        const results = {};
        
        try {
            for (const type of recordTypes) {
                try {
                    await this.rateLimit('dns', 100);
                    
                    const url = `${this.dataSources.dnsOverHttps}?name=${encodeURIComponent(domain)}&type=${type}`;
                    const response = await fetch(url, {
                        headers: {
                            'Accept': 'application/dns-json',
                            'User-Agent': this.userAgent
                        }
                    });
                    
                    if (response.ok) {
                        const data = await response.json();
                        if (data.Answer && data.Answer.length > 0) {
                            results[type] = data.Answer.map(record => record.data);
                        }
                    }
                } catch (err) {
                    console.warn(`DNS ${type} lookup failed for ${domain}:`, err.message);
                }
            }
            
            const hasRecords = Object.keys(results).length > 0;
            
            return {
                found: hasRecords,
                domain: domain,
                records: results,
                ipAddresses: results.A || [],
                ipv6Addresses: results.AAAA || [],
                mailServers: results.MX || [],
                nameservers: results.NS || [],
                textRecords: results.TXT || [],
                collectionMethod: 'DNS over HTTPS'
            };
            
        } catch (error) {
            console.error('DNS lookup failed:', error);
            return { found: false, domain: domain, error: error.message };
        }
    }

    // Real IP geolocation lookup (CORS-friendly)
    async getIPGeolocation(ip) {
        try {
            await this.rateLimit('ip', 1000);
            
            const url = this.dataSources.ipGeolocation.replace('%IP%', encodeURIComponent(ip));
            const response = await this.fetchWithRetry(url);
            
            if (!response.ok) {
                throw new Error(`IP lookup failed: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.error) {
                return { found: false, ip: ip, error: data.error.message };
            }
            
            return {
                found: true,
                ip: ip,
                country: data.country,
                region: data.region,
                city: data.city,
                organization: data.org,
                isp: data.org,
                timezone: data.timezone,
                postal: data.postal,
                coordinates: {
                    lat: parseFloat(data.loc?.split(',')[0]) || null,
                    lon: parseFloat(data.loc?.split(',')[1]) || null
                },
                hostname: data.hostname,
                collectionMethod: 'IP Geolocation Database'
            };
            
        } catch (error) {
            console.error('IP geolocation failed:', error);
            return { found: false, ip: ip, error: error.message };
        }
    }

    // CORS-friendly social media intelligence (alternative approach)
    async checkSocialPresence(username) {
        // Instead of HTTP requests, generate intelligence about social presence
        // This avoids CORS issues while still providing useful analysis
        
        const platforms = [
            { name: 'github', baseUrl: 'https://github.com/' },
            { name: 'twitter', baseUrl: 'https://twitter.com/' },
            { name: 'instagram', baseUrl: 'https://instagram.com/' },
            { name: 'reddit', baseUrl: 'https://reddit.com/user/' },
            { name: 'youtube', baseUrl: 'https://youtube.com/@' }
        ];
        
        const socialIntelligence = {
            found: true,
            username: username,
            analysisType: 'Social Intelligence Analysis',
            collectionMethod: 'Pattern Analysis & URL Generation',
            profiles: platforms.map(platform => ({
                platform: platform.name,
                username: username,
                url: platform.baseUrl + username,
                status: 'requires_manual_verification',
                analysis: this.analyzeSocialPattern(username, platform.name)
            })),
            recommendations: [
                'Manually verify generated URLs for actual profile existence',
                'Use browser network tools to check HTTP status codes',
                'Consider using browser extensions for automated checking'
            ],
            patterns: this.analyzeUsernamePatterns(username),
            totalChecked: platforms.length
        };
        
        return socialIntelligence;
    }

    analyzeSocialPattern(username, platform) {
        const patterns = {
            github: {
                likely: /^[a-zA-Z0-9]([a-zA-Z0-9-])*[a-zA-Z0-9]$/.test(username) && username.length >= 3,
                reasoning: 'GitHub allows alphanumeric characters and hyphens'
            },
            twitter: {
                likely: /^[a-zA-Z0-9_]+$/.test(username) && username.length <= 15,
                reasoning: 'Twitter usernames are alphanumeric with underscores, max 15 chars'
            },
            instagram: {
                likely: /^[a-zA-Z0-9._]+$/.test(username) && username.length <= 30,
                reasoning: 'Instagram allows letters, numbers, periods, and underscores'
            },
            reddit: {
                likely: /^[a-zA-Z0-9_-]+$/.test(username) && username.length >= 3,
                reasoning: 'Reddit usernames are alphanumeric with underscores and hyphens'
            },
            youtube: {
                likely: /^[a-zA-Z0-9._-]+$/.test(username),
                reasoning: 'YouTube handles are alphanumeric with periods, underscores, hyphens'
            }
        };
        
        const pattern = patterns[platform] || { likely: false, reasoning: 'Unknown platform pattern' };
        return {
            patternMatch: pattern.likely,
            confidence: pattern.likely ? 'high' : 'low',
            reasoning: pattern.reasoning
        };
    }

    analyzeUsernamePatterns(username) {
        return {
            length: username.length,
            hasNumbers: /\d/.test(username),
            hasSpecialChars: /[._-]/.test(username),
            isAlphanumeric: /^[a-zA-Z0-9]+$/.test(username),
            commonWords: /^(admin|user|test|demo|example|sample)/.test(username.toLowerCase()),
            complexity: this.calculateUsernameComplexity(username)
        };
    }

    calculateUsernameComplexity(username) {
        let score = 0;
        if (username.length >= 8) score += 1;
        if (/[A-Z]/.test(username)) score += 1;
        if (/[a-z]/.test(username)) score += 1;
        if (/\d/.test(username)) score += 1;
        if (/[._-]/.test(username)) score += 1;
        
        if (score <= 2) return 'low';
        if (score <= 3) return 'medium';
        return 'high';
    }

    // Enhanced email intelligence gathering
    async analyzeEmail(email) {
        const [username, domain] = email.split('@');
        
        // Gather intelligence from multiple sources
        const [domainDNS, domainCerts, socialAnalysis] = await Promise.allSettled([
            this.getDNSRecords(domain),
            this.getCertificateData(domain),
            this.checkSocialPresence(username)
        ]);
        
        const results = {
            found: true,
            email: email,
            username: username,
            domain: domain,
            structure: {
                usernameLength: username.length,
                domainParts: domain.split('.').length,
                hasNumbers: /\d/.test(username),
                hasSpecialChars: /[._-]/.test(username)
            },
            collectionMethod: 'Multi-source email intelligence analysis'
        };
        
        // Add DNS intelligence if successful
        if (domainDNS.status === 'fulfilled' && domainDNS.value.found) {
            results.domainDNS = domainDNS.value;
        }
        
        // Add certificate intelligence if successful
        if (domainCerts.status === 'fulfilled' && domainCerts.value.found) {
            results.domainCertificates = domainCerts.value;
        }
        
        // Add social intelligence analysis
        if (socialAnalysis.status === 'fulfilled') {
            results.socialProfiles = socialAnalysis.value;
        }
        
        return results;
    }

    // Search engine intelligence generation (CORS-friendly)
    async searchEngineIntelligence(query, type = 'general') {
        const searchQueries = this.buildSearchQueries(query, type);
        const dorking = this.buildGoogleDorks(query, type);
        
        return {
            found: true,
            query: query,
            searchQueries: searchQueries,
            googleDorks: dorking,
            investigations: this.buildInvestigationSteps(query, type),
            collectionMethod: 'Search Intelligence Generation',
            recommendation: 'Use these queries in search engines for manual investigation'
        };
    }

    buildSearchQueries(target, type) {
        const queries = [];
        
        switch (type) {
            case 'email':
                queries.push(
                    `"${target}"`,
                    `"${target}" site:pastebin.com`,
                    `"${target}" filetype:pdf`,
                    `"${target}" "breach" OR "leak"`,
                    `"${target}" "password" OR "dump"`
                );
                break;
                
            case 'username':
                queries.push(
                    `"${target}"`,
                    `"${target}" site:github.com`,
                    `"${target}" site:reddit.com`,
                    `"${target}" "profile" OR "user"`,
                    `"${target}" social media`
                );
                break;
                
            case 'domain':
                queries.push(
                    `site:${target}`,
                    `"${target}" subdomain`,
                    `"${target}" inurl:admin`,
                    `"${target}" filetype:pdf OR filetype:doc`,
                    `"${target}" employees OR staff`
                );
                break;
                
            default:
                queries.push(`"${target}"`);
        }
        
        return queries;
    }

    buildGoogleDorks(target, type) {
        const dorks = [];
        
        switch (type) {
            case 'domain':
                dorks.push(
                    `site:${target} inurl:admin`,
                    `site:${target} intitle:"index of"`,
                    `site:${target} filetype:pdf`,
                    `site:${target} inurl:login`,
                    `"${target}" site:github.com`
                );
                break;
                
            case 'email':
                dorks.push(
                    `"${target}" site:pastebin.com`,
                    `"${target}" filetype:xlsx OR filetype:csv`,
                    `"${target}" "contact" OR "email"`,
                    `"${target}" site:linkedin.com`
                );
                break;
                
            default:
                dorks.push(`"${target}"`);
        }
        
        return dorks;
    }

    buildInvestigationSteps(target, type) {
        const steps = [
            `1. Search for "${target}" in major search engines`,
            `2. Check social media platforms manually`,
            `3. Look for cached or archived versions`,
            `4. Use specialized search engines (Shodan, Censys)`,
            `5. Check public databases and registries`
        ];
        
        if (type === 'domain') {
            steps.push(
                `6. Enumerate subdomains using tools`,
                `7. Check certificate transparency logs`,
                `8. Analyze DNS records`
            );
        }
        
        return steps;
    }

    // Helper methods
    async fetchWithRetry(url, options = {}, maxRetries = 3) {
        for (let i = 0; i < maxRetries; i++) {
            try {
                const response = await fetch(url, {
                    ...options,
                    headers: {
                        'User-Agent': this.userAgent,
                        ...options.headers
                    }
                });
                return response;
            } catch (error) {
                if (i === maxRetries - 1) throw error;
                await this.delay(1000 * (i + 1));
            }
        }
    }

    async rateLimit(service, minInterval) {
        const now = Date.now();
        const lastRequest = this.rateLimits.get(service) || 0;
        const timeSinceLastRequest = now - lastRequest;
        
        if (timeSinceLastRequest < minInterval) {
            const waitTime = minInterval - timeSinceLastRequest;
            await this.delay(waitTime);
        }
        
        this.rateLimits.set(service, Date.now());
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Cache management
    getCached(key) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < 3600000) {
            return cached.data;
        }
        return null;
    }

    setCached(key, data) {
        this.cache.set(key, {
            data: data,
            timestamp: Date.now()
        });
    }
}

// Export for use in source manager
if (typeof window !== 'undefined') {
    window.OSINTCollector = OSINTCollector;
}