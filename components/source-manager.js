// OSINT Source Manager - Handles data source configuration and requests
class SourceManager {
    constructor() {
        this.sources = null;
        this.cache = new Map();
        this.activeRequests = new Set();
        this.initialized = false;
    }

    async initialize() {
        try {
            console.log('Initializing OSINT sources...');
            this.sources = await this.loadSources();
            this.initialized = true;
            console.log(`Loaded ${this.getTotalSourceCount()} OSINT sources`);
            return true;
        } catch (error) {
            console.error('Failed to initialize sources:', error);
            return false;
        }
    }

    async loadSources() {
        try {
            const response = await fetch('./data/sources.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error loading sources configuration:', error);
            // Return fallback minimal config
            return this.getFallbackSources();
        }
    }

    getFallbackSources() {
        return {
            version: "1.0",
            categories: {
                email: { name: "Email Intelligence", sources: [] },
                domain: { name: "Domain Intelligence", sources: [] },
                username: { name: "Username Intelligence", sources: [] },
                ip: { name: "IP Intelligence", sources: [] }
            },
            settings: {
                maxConcurrentRequests: 5,
                defaultTimeout: 10000,
                retryAttempts: 3
            }
        };
    }

    getSourcesForType(searchType) {
        if (!this.initialized || !this.sources) {
            console.warn('Sources not initialized');
            return [];
        }

        const category = this.sources.categories[searchType];
        if (!category) {
            console.warn(`No sources found for type: ${searchType}`);
            return [];
        }

        return category.sources.filter(source => source.enabled);
    }

    getAllSources() {
        if (!this.initialized || !this.sources) {
            return [];
        }

        const allSources = [];
        Object.values(this.sources.categories).forEach(category => {
            allSources.push(...category.sources.filter(source => source.enabled));
        });

        return allSources;
    }

    getTotalSourceCount() {
        const allSources = this.getAllSources();
        return allSources.length;
    }

    getSourcesByCategory() {
        if (!this.initialized || !this.sources) {
            return {};
        }

        const result = {};
        Object.entries(this.sources.categories).forEach(([key, category]) => {
            result[key] = {
                name: category.name,
                description: category.description,
                sources: category.sources.filter(source => source.enabled),
                count: category.sources.filter(source => source.enabled).length
            };
        });

        return result;
    }

    async querySource(sourceId, query, searchType) {
        const source = this.findSourceById(sourceId);
        if (!source) {
            throw new Error(`Source not found: ${sourceId}`);
        }

        // Check cache first
        const cacheKey = `${sourceId}:${query}`;
        if (this.cache.has(cacheKey)) {
            console.log(`Cache hit for ${sourceId}:${query}`);
            return this.cache.get(cacheKey);
        }

        // Rate limiting
        if (this.activeRequests.has(sourceId)) {
            console.log(`Rate limiting ${sourceId}, request already in progress`);
            await this.delay(source.rateLimit || 1000);
        }

        try {
            this.activeRequests.add(sourceId);
            console.log(`Querying ${source.name} for: ${query}`);

            // Simulate API call (since we're using mock data)
            const result = await this.simulateSourceQuery(source, query, searchType);
            
            // Cache the result
            this.cache.set(cacheKey, result);
            
            return result;
        } finally {
            this.activeRequests.delete(sourceId);
        }
    }

    async simulateSourceQuery(source, query, searchType) {
        // Simulate network delay
        await this.delay(500 + Math.random() * 1000);

        // Generate mock data based on source type
        const mockData = this.generateMockData(source, query, searchType);
        
        return {
            sourceId: source.id,
            sourceName: source.name,
            query: query,
            searchType: searchType,
            confidence: source.confidence,
            timestamp: new Date().toISOString(),
            data: mockData,
            success: true
        };
    }

    generateMockData(source, query, searchType) {
        // This will be replaced with real API calls in later commits
        const baseData = {
            query: query,
            found: Math.random() > 0.3, // 70% chance of finding data
            source: source.name,
            dataTypes: source.dataTypes || []
        };

        // Add source-specific mock data
        switch (source.type) {
            case 'breach_database':
                return {
                    ...baseData,
                    breaches: ['LinkedIn 2016', 'MySpace 2013', 'Adobe 2013'],
                    totalBreaches: 3,
                    lastBreach: '2016-05-18'
                };

            case 'social_media':
                return {
                    ...baseData,
                    platforms: ['twitter', 'instagram', 'github'],
                    profiles: [
                        { platform: 'twitter', username: query, verified: false },
                        { platform: 'github', username: query, publicRepos: 12 }
                    ]
                };

            case 'registration':
                return {
                    ...baseData,
                    registrar: 'Example Registrar Inc.',
                    creationDate: '2018-03-15',
                    expiryDate: '2025-03-15',
                    nameservers: ['ns1.example.com', 'ns2.example.com']
                };

            case 'geolocation':
                return {
                    ...baseData,
                    country: 'United States',
                    region: 'California',
                    city: 'San Francisco',
                    isp: 'Example ISP',
                    coordinates: { lat: 37.7749, lon: -122.4194 }
                };

            default:
                return baseData;
        }
    }

    findSourceById(sourceId) {
        const allSources = this.getAllSources();
        return allSources.find(source => source.id === sourceId);
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    getSourceStats() {
        const categories = this.getSourcesByCategory();
        const stats = {
            totalSources: 0,
            totalCategories: Object.keys(categories).length,
            enabledSources: 0,
            categoriesBreakdown: {}
        };

        Object.entries(categories).forEach(([key, category]) => {
            stats.totalSources += category.count;
            stats.enabledSources += category.count;
            stats.categoriesBreakdown[key] = {
                name: category.name,
                count: category.count
            };
        });

        return stats;
    }

    // Get human-readable source information for UI
    getSourceInfo(sourceId) {
        const source = this.findSourceById(sourceId);
        if (!source) return null;

        return {
            id: source.id,
            name: source.name,
            description: source.description,
            confidence: source.confidence,
            dataTypes: source.dataTypes || [],
            type: source.type,
            enabled: source.enabled
        };
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.SourceManager = SourceManager;
}