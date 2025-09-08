// OSINT Data Aggregator - Real Intelligence Gathering
class OSINTAggregator {
    constructor() {
        this.currentQuery = '';
        this.currentResults = {};
        this.sourceManager = null;
        this.init();
    }

    async init() {
        this.bindEvents();
        this.setupTabs();
        
        // Initialize source manager
        try {
            this.sourceManager = new SourceManager();
            const initialized = await this.sourceManager.initialize();
            
            if (initialized) {
                this.displaySourceStats();
                console.log('Real OSINT Data Aggregator initialized with intelligence sources');
            } else {
                console.warn('OSINT Data Aggregator initialized without sources');
            }
        } catch (error) {
            console.error('Failed to initialize source manager:', error);
            console.log('OSINT Data Aggregator initialized without sources');
        }
    }

    bindEvents() {
        // Search functionality
        const searchBtn = document.getElementById('searchBtn');
        const searchInput = document.getElementById('searchInput');

        searchBtn.addEventListener('click', () => this.performSearch());
        
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.performSearch();
            }
        });

        // Auto-detect search type
        searchInput.addEventListener('input', () => {
            this.autoDetectSearchType();
        });
    }

    setupTabs() {
        const tabButtons = document.querySelectorAll('.tab-btn');
        
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tabName = button.getAttribute('data-tab');
                this.switchTab(tabName);
            });
        });
    }

    switchTab(tabName) {
        // Remove active class from all buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        // Hide all tab contents
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.add('hidden');
        });

        // Activate selected tab
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(`${tabName}Tab`).classList.remove('hidden');

        console.log(`Switched to ${tabName} tab`);
    }

    autoDetectSearchType() {
        const input = document.getElementById('searchInput').value.trim();
        const searchType = document.getElementById('searchType');

        if (!input) {
            searchType.value = 'auto';
            return;
        }

        // Email pattern
        if (input.includes('@') && input.includes('.')) {
            searchType.value = 'email';
        }
        // IP address pattern
        else if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(input)) {
            searchType.value = 'ip';
        }
        // Domain pattern
        else if (input.includes('.') && !input.includes('@')) {
            searchType.value = 'domain';
        }
        // Default to username
        else {
            searchType.value = 'username';
        }
    }

    async performSearch() {
        const query = document.getElementById('searchInput').value.trim();
        const searchType = document.getElementById('searchType').value;

        if (!query) {
            this.showError('Please enter a search query');
            return;
        }

        this.currentQuery = query;
        
        console.log(`Gathering real intelligence for: ${query} (type: ${searchType})`);
        
        // Show results section
        document.getElementById('resultsSection').style.display = 'block';
        
        // Show loading state
        this.showLoading();

        // Perform real intelligence gathering
        if (this.sourceManager && this.sourceManager.initialized) {
            try {
                await this.performRealIntelligenceGathering(query, searchType);
            } catch (error) {
                console.error('Intelligence gathering failed:', error);
                this.showError('Intelligence gathering failed. Please try again.');
            }
        } else {
            this.showError('Intelligence sources not available');
        }
    }

    async performRealIntelligenceGathering(query, searchType) {
        const availableSources = this.sourceManager.getSourcesForType(searchType);
        
        if (availableSources.length === 0) {
            this.showError(`No intelligence sources available for ${searchType} searches`);
            return;
        }

        // Initialize results
        this.currentResults = {
            query: query,
            searchType: searchType,
            timestamp: new Date().toISOString(),
            sources: [],
            summary: {
                totalSources: availableSources.length,
                successfulSources: 0,
                failedSources: 0,
                dataFound: false
            }
        };

        console.log(`Querying ${availableSources.length} intelligence sources for ${searchType}: ${query}`);

        // Query all sources concurrently with rate limiting
        const intelligencePromises = availableSources.map((source, index) => 
            this.delay(index * 500).then(() => // Stagger requests
                this.querySourceWithRetry(source.id, query, searchType)
            )
        );

        // Wait for all intelligence gathering to complete
        const results = await Promise.allSettled(intelligencePromises);
        
        // Process results
        results.forEach((result, index) => {
            if (result.status === 'fulfilled' && result.value.success) {
                this.currentResults.sources.push(result.value);
                this.currentResults.summary.successfulSources++;
                if (result.value.data.found) {
                    this.currentResults.summary.dataFound = true;
                }
            } else {
                this.currentResults.summary.failedSources++;
                console.warn(`Intelligence source ${availableSources[index].name} failed:`, result.reason);
            }
        });

        // Display intelligence results
        this.displayIntelligenceResults();
        this.updateTimelineResults();
        this.updateNetworkResults();
    }

    async querySourceWithRetry(sourceId, query, searchType, maxRetries = 2) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await this.sourceManager.querySource(sourceId, query, searchType);
            } catch (error) {
                console.warn(`Intelligence source ${sourceId} attempt ${attempt} failed:`, error);
                if (attempt === maxRetries) {
                    throw error;
                }
                // Wait before retry
                await this.delay(2000 * attempt);
            }
        }
    }

    showLoading() {
        const resultsDiv = document.getElementById('searchResults');
        resultsDiv.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <div class="loading"></div>
                <p style="margin-top: 15px; color: var(--text-secondary);">
                    Gathering real intelligence from OSINT sources...
                </p>
            </div>
        `;
    }

    displayIntelligenceResults() {
        const resultsDiv = document.getElementById('searchResults');
        const results = this.currentResults;
        
        // Create intelligence summary section
        const summaryHtml = `
            <div class="search-summary">
                <h4>Intelligence Report for: <span style="color: var(--accent-primary);">${results.query}</span></h4>
                <div class="summary-stats">
                    <span class="stat">Type: ${results.searchType.charAt(0).toUpperCase() + results.searchType.slice(1)}</span>
                    <span class="stat">Sources: ${results.summary.successfulSources}/${results.summary.totalSources}</span>
                    <span class="stat ${results.summary.dataFound ? 'data-found' : 'no-data'}">
                        ${results.summary.dataFound ? '✅ Intelligence Gathered' : '❌ No Intelligence'}
                    </span>
                </div>
                <hr style="margin: 15px 0; border-color: var(--border-color);">
            </div>
        `;

        // Create intelligence cards from each source
        const intelligenceHtml = results.sources.map(sourceResult => {
            const confidence = sourceResult.confidence;
            const data = sourceResult.data;
            
            return `
                <div class="result-card ${data.found ? 'has-data' : 'no-data'}">
                    <div class="result-header">
                        <div class="source-info">
                            <span class="source-name">${sourceResult.sourceName}</span>
                            <span class="confidence-badge">${confidence}%</span>
                        </div>
                        <div class="result-status ${data.found ? 'found' : 'not-found'}">
                            ${data.found ? '✅ Intelligence Found' : '❌ No Data'}
                        </div>
                    </div>
                    
                    ${data.found ? this.renderIntelligenceData(sourceResult) : `
                        <div class="no-data-message">
                            <p>${data.error || 'No intelligence data found for this query'}</p>
                        </div>
                    `}
                    
                    <div class="result-footer">
                        <small>Collected: ${new Date(sourceResult.timestamp).toLocaleString()}</small>
                        ${data.collectionMethod ? `<br><small>Method: ${data.collectionMethod}</small>` : ''}
                    </div>
                </div>
            `;
        }).join('');

        resultsDiv.innerHTML = summaryHtml + '<div class="results-grid">' + intelligenceHtml + '</div>';
    }

    renderIntelligenceData(sourceResult) {
        const data = sourceResult.data;
        const sourceType = this.sourceManager.findSourceById(sourceResult.sourceId)?.type;
        
        // Handle error cases
        if (data.error) {
            return `
                <div class="data-content">
                    <h5>⚠️ Collection Error</h5>
                    <div class="error-message">
                        <p>${data.error}</p>
                    </div>
                </div>
            `;
        }
        
        switch (sourceType) {
            case 'certificate_intelligence':
                return `
                    <div class="data-content">
                        <h5>🔒 Certificate Intelligence</h5>
                        <div class="cert-info">
                            <p><strong>Total Certificates:</strong> ${data.totalCertificates || 0}</p>
                            ${data.subdomains && data.subdomains.length > 0 ? `
                                <p><strong>Subdomains Found:</strong> ${data.subdomains.slice(0, 5).join(', ')}${data.subdomains.length > 5 ? '...' : ''}</p>
                            ` : ''}
                            ${data.issuers && data.issuers.length > 0 ? `
                                <p><strong>Certificate Authorities:</strong> ${data.issuers.join(', ')}</p>
                            ` : ''}
                        </div>
                    </div>
                `;
                
            case 'dns_intelligence':
                return `
                    <div class="data-content">
                        <h5>🌐 DNS Intelligence</h5>
                        <div class="dns-info">
                            ${data.ipAddresses && data.ipAddresses.length > 0 ? `
                                <p><strong>IP Addresses:</strong> ${data.ipAddresses.join(', ')}</p>
                            ` : ''}
                            ${data.nameservers && data.nameservers.length > 0 ? `
                                <p><strong>Name Servers:</strong> ${data.nameservers.join(', ')}</p>
                            ` : ''}
                            ${data.mailServers && data.mailServers.length > 0 ? `
                                <p><strong>Mail Servers:</strong> ${data.mailServers.join(', ')}</p>
                            ` : ''}
                            ${data.textRecords && data.textRecords.length > 0 ? `
                                <p><strong>TXT Records:</strong> ${data.textRecords.length} found</p>
                            ` : ''}
                        </div>
                    </div>
                `;
                
            case 'social_intelligence':
                return `
                    <div class="data-content">
                        <h5>👥 Social Media Intelligence</h5>
                        <div class="social-info">
                            <p><strong>Platforms Found:</strong> ${data.totalFound || 0}/${data.totalChecked || 0}</p>
                            ${data.profiles && data.profiles.length > 0 ? `
                                <div class="profile-list">
                                    ${data.profiles.map(profile => `
                                        <div class="profile-item">
                                            <span class="platform">${profile.platform}</span>
                                            <span class="status">${profile.status}</span>
                                            <a href="${profile.url}" target="_blank" rel="noopener">View Profile</a>
                                        </div>
                                    `).join('')}
                                </div>
                            ` : ''}
                        </div>
                    </div>
                `;
                
            case 'email_intelligence':
                return `
                    <div class="data-content">
                        <h5>📧 Email Intelligence</h5>
                        <div class="email-info">
                            <p><strong>Username:</strong> ${data.username}</p>
                            <p><strong>Domain:</strong> ${data.domain}</p>
                            ${data.structure ? `
                                <div class="structure-info">
                                    <p><strong>Username Length:</strong> ${data.structure.usernameLength}</p>
                                    <p><strong>Has Numbers:</strong> ${data.structure.hasNumbers ? 'Yes' : 'No'}</p>
                                    <p><strong>Special Characters:</strong> ${data.structure.hasSpecialChars ? 'Yes' : 'No'}</p>
                                </div>
                            ` : ''}
                            ${data.domainDNS && data.domainDNS.found ? `
                                <p><strong>Domain Intelligence:</strong> DNS records found</p>
                            ` : ''}
                            ${data.socialProfiles && data.socialProfiles.found ? `
                                <p><strong>Social Profiles:</strong> ${data.socialProfiles.totalFound} profiles found</p>
                            ` : ''}
                        </div>
                    </div>
                `;
                
            case 'ip_intelligence':
                return `
                    <div class="data-content">
                        <h5>🌍 IP Intelligence</h5>
                        <div class="ip-info">
                            <p><strong>Country:</strong> ${data.country || 'Unknown'}</p>
                            <p><strong>Region:</strong> ${data.region || 'Unknown'}</p>
                            <p><strong>City:</strong> ${data.city || 'Unknown'}</p>
                            <p><strong>Organization:</strong> ${data.organization || data.isp || 'Unknown'}</p>
                            ${data.coordinates && data.coordinates.lat ? `
                                <p><strong>Coordinates:</strong> ${data.coordinates.lat}, ${data.coordinates.lon}</p>
                            ` : ''}
                            ${data.timezone ? `<p><strong>Timezone:</strong> ${data.timezone}</p>` : ''}
                        </div>
                    </div>
                `;
                
            default:
                return `
                    <div class="data-content">
                        <h5>📊 Intelligence Data</h5>
                        <div class="generic-data">
                            <p>Intelligence gathered by ${sourceResult.sourceName}</p>
                            ${data.message ? `<p>${data.message}</p>` : ''}
                            ${data.collectionMethod ? `<p><strong>Method:</strong> ${data.collectionMethod}</p>` : ''}
                        </div>
                    </div>
                `;
        }
    }

    updateTimelineResults() {
        const timelineDiv = document.getElementById('timeline');
        
        if (!this.currentResults || this.currentResults.sources.length === 0) {
            this.updateTimelinePlaceholder();
            return;
        }

        // Create timeline data from intelligence results
        const timelineEvents = [];
        
        this.currentResults.sources.forEach(sourceResult => {
            if (sourceResult.data.found) {
                const data = sourceResult.data;
                
                // Add certificate events
                if (data.certificates) {
                    data.certificates.forEach(cert => {
                        if (cert.notBefore) {
                            timelineEvents.push({
                                date: cert.notBefore,
                                event: `Certificate issued by ${cert.issuer}`,
                                source: sourceResult.sourceName,
                                type: 'certificate'
                            });
                        }
                    });
                }
                
                // Add social media events
                if (data.profiles) {
                    data.profiles.forEach(profile => {
                        timelineEvents.push({
                            date: new Date().toISOString().split('T')[0], // Today as discovery date
                            event: `${profile.platform} profile discovered`,
                            source: sourceResult.sourceName,
                            type: 'social'
                        });
                    });
                }
                
                // Add domain registration events
                if (data.domain) {
                    timelineEvents.push({
                        date: new Date().toISOString().split('T')[0],
                        event: `Domain intelligence gathered`,
                        source: sourceResult.sourceName,
                        type: 'domain'
                    });
                }
            }
        });

        // Sort by date
        timelineEvents.sort((a, b) => new Date(a.date) - new Date(b.date));

        const timelineHtml = `
            <div class="timeline-header">
                <h3>📅 Intelligence Timeline</h3>
                <p>${timelineEvents.length} events found for ${this.currentResults.query}</p>
            </div>
            <div class="timeline-events">
                ${timelineEvents.map((event, index) => `
                    <div class="timeline-event ${event.type}">
                        <div class="event-date">${new Date(event.date).toLocaleDateString()}</div>
                        <div class="event-content">
                            <div class="event-title">${event.event}</div>
                            <div class="event-source">Source: ${event.source}</div>
                        </div>
                    </div>
                `).join('')}
                ${timelineEvents.length === 0 ? '<p style="text-align: center; color: var(--text-secondary);">No timeline events found</p>' : ''}
            </div>
        `;

        timelineDiv.innerHTML = timelineHtml;
    }

    updateNetworkResults() {
        const networkDiv = document.getElementById('networkGraph');
        
        if (!this.currentResults || this.currentResults.sources.length === 0) {
            this.updateNetworkPlaceholder();
            return;
        }

        // Create network relationships from intelligence results
        const relationships = [];
        const entities = new Set([this.currentResults.query]);
        
        this.currentResults.sources.forEach(sourceResult => {
            if (sourceResult.data.found) {
                const data = sourceResult.data;
                
                // Add IP relationships
                if (data.ipAddresses) {
                    data.ipAddresses.forEach(ip => {
                        entities.add(ip);
                        relationships.push({
                            from: this.currentResults.query,
                            to: ip,
                            type: 'resolves_to',
                            source: sourceResult.sourceName
                        });
                    });
                }
                
                // Add subdomain relationships
                if (data.subdomains) {
                    data.subdomains.slice(0, 10).forEach(subdomain => {
                        entities.add(subdomain);
                        relationships.push({
                            from: this.currentResults.query,
                            to: subdomain,
                            type: 'subdomain',
                            source: sourceResult.sourceName
                        });
                    });
                }
                
                // Add social profile relationships
                if (data.profiles) {
                    data.profiles.forEach(profile => {
                        const profileId = `${profile.platform}:${profile.username || this.currentResults.query}`;
                        entities.add(profileId);
                        relationships.push({
                            from: this.currentResults.query,
                            to: profileId,
                            type: 'social_profile',
                            source: sourceResult.sourceName
                        });
                    });
                }
                
                // Add organization relationships
                if (data.organization || data.isp) {
                    const org = data.organization || data.isp;
                    entities.add(org);
                    relationships.push({
                        from: this.currentResults.query,
                        to: org,
                        type: 'organization',
                        source: sourceResult.sourceName
                    });
                }
            }
        });

        const networkHtml = `
            <div class="network-header">
                <h3>🕸️ Intelligence Network</h3>
                <p>${entities.size} entities, ${relationships.length} relationships</p>
            </div>
            <div class="network-visualization">
                <div class="network-stats">
                    <div class="stat-item">
                        <span class="stat-label">Target Entity:</span>
                        <span class="stat-value">${this.currentResults.query}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Related Entities:</span>
                        <span class="stat-value">${entities.size - 1}</span>
                    </div>
                </div>
                
                <div class="relationships-list">
                    ${relationships.map(rel => `
                        <div class="relationship-item ${rel.type}">
                            <div class="relationship-path">
                                <span class="entity from">${rel.from}</span>
                                <span class="arrow">→</span>
                                <span class="entity to">${rel.to}</span>
                            </div>
                            <div class="relationship-meta">
                                <span class="type">${rel.type.replace('_', ' ')}</span>
                                <span class="source">via ${rel.source}</span>
                            </div>
                        </div>
                    `).join('')}
                    ${relationships.length === 0 ? '<p style="text-align: center; color: var(--text-secondary);">No relationships found</p>' : ''}
                </div>
            </div>
        `;

        networkDiv.innerHTML = networkHtml;
    }

    displaySourceStats() {
        // Add source statistics to the header
        if (this.sourceManager && this.sourceManager.initialized) {
            const stats = this.sourceManager.getSourceStats();
            console.log('Real OSINT intelligence sources loaded:', stats);
            
            // Update the header subtitle with source count
            const headerP = document.querySelector('.header p');
            if (headerP) {
                headerP.textContent = `Real intelligence gathering from ${stats.totalSources} OSINT sources`;
            }
        }
    }

    updateTimelinePlaceholder() {
        const timelineDiv = document.getElementById('timeline');
        timelineDiv.innerHTML = `
            <div style="text-align: center; color: var(--text-secondary);">
                <h3>📅 Timeline View</h3>
                <p>Intelligence timeline will be populated after data collection</p>
            </div>
        `;
    }

    updateNetworkPlaceholder() {
        const networkDiv = document.getElementById('networkGraph');
        networkDiv.innerHTML = `
            <div style="text-align: center; color: var(--text-secondary);">
                <h3>🕸️ Network Graph</h3>
                <p>Relationship mapping will be populated after data collection</p>
            </div>
        `;
    }

    showError(message) {
        const resultsDiv = document.getElementById('searchResults');
        resultsDiv.innerHTML = `
            <div style="color: #ff4444; text-align: center; padding: 20px;">
                ⚠️ ${message}
            </div>
        `;
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    let componentsLoaded = 0;
    const totalComponents = 2;
    
    function checkAllComponentsLoaded() {
        componentsLoaded++;
        if (componentsLoaded === totalComponents) {
            console.log('All OSINT components loaded, initializing aggregator...');
            new OSINTAggregator();
        }
    }
    
    // Load OSINT collector
    const collectorScript = document.createElement('script');
    collectorScript.src = './components/osint-collector.js';
    collectorScript.onload = () => {
        console.log('Real OSINT collector loaded');
        checkAllComponentsLoaded();
    };
    collectorScript.onerror = () => {
        console.error('Failed to load osint-collector.js');
        checkAllComponentsLoaded();
    };
    document.head.appendChild(collectorScript);
    
    // Load source manager
    const managerScript = document.createElement('script');
    managerScript.src = './components/source-manager.js';
    managerScript.onload = () => {
        console.log('Integrated source manager loaded');
        checkAllComponentsLoaded();
    };
    managerScript.onerror = () => {
        console.error('Failed to load source-manager.js');
        checkAllComponentsLoaded();
    };
    document.head.appendChild(managerScript);
});