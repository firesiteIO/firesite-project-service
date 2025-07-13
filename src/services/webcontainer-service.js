/**
 * WebContainer Service
 * Manages WebContainer integration for hot reload and development workflow
 * Based on established Firesite patterns from firesite-io-slim and firesite-chat-service
 */

import { WebContainer } from '@webcontainer/api';
import { eventBus } from '../core/events/event-bus.js';

export class WebContainerService {
  constructor(options = {}) {
    this.options = {
      serverUrl: 'http://localhost:3000',
      bootTimeout: 30000,
      terminalElement: '#webcontainer-terminal',
      ...options
    };
    
    this.webcontainerInstance = null;
    this.isBooting = false;
    this.isReady = false;
    this.isInitialized = false;
    this.serverUrl = null;
    this.processes = new Map();
  }

  /**
   * Initialize WebContainer service
   */
  async initialize() {
    if (this.isInitialized) return;

    try {
      console.log('🐳 Initializing WebContainer service...');
      
      // Check WebContainer support
      const supportResults = this.checkSupport();
      if (!supportResults.supported) {
        console.warn('⚠️ WebContainer not supported, falling back to standard development');
        this.isInitialized = true;
        return false;
      }

      // Boot WebContainer if supported
      const booted = await this.bootWebContainer();
      
      this.isInitialized = true;
      eventBus.emit('webcontainer:initialized', { 
        service: this, 
        supported: supportResults.supported,
        booted: booted 
      });
      
      console.log(`✅ WebContainer service initialized (supported: ${supportResults.supported}, booted: ${booted})`);
      return booted;
      
    } catch (error) {
      console.error('❌ Failed to initialize WebContainer service:', error);
      this.isInitialized = true; // Mark as initialized but failed
      return false;
    }
  }

  /**
   * Check WebContainer browser support
   */
  checkSupport() {
    const crossOriginIsolated = window.crossOriginIsolated;
    const sharedArrayBufferAvailable = typeof SharedArrayBuffer !== 'undefined';
    const supported = crossOriginIsolated && sharedArrayBufferAvailable;

    const results = {
      crossOriginIsolated,
      sharedArrayBufferAvailable,
      supported,
      details: {
        userAgent: navigator.userAgent,
        crossOriginIsolated: crossOriginIsolated ? 'YES' : 'NO',
        sharedArrayBuffer: sharedArrayBufferAvailable ? 'YES' : 'NO'
      }
    };

    console.log('🔍 WebContainer Support Check:', results);
    
    if (!supported) {
      const missingFeatures = [];
      if (!crossOriginIsolated) missingFeatures.push('Cross-Origin Isolation');
      if (!sharedArrayBufferAvailable) missingFeatures.push('SharedArrayBuffer');
      
      console.warn(`⚠️ WebContainer not supported. Missing: ${missingFeatures.join(', ')}`);
      console.warn('💡 Make sure your server is configured with the correct COOP/COEP headers');
    }

    return results;
  }

  /**
   * Boot WebContainer instance
   */
  async bootWebContainer() {
    if (this.isBooting || this.isReady) {
      return this.isReady;
    }

    this.isBooting = true;

    try {
      console.log('🚀 Booting WebContainer...');
      
      // Boot WebContainer with timeout
      const bootPromise = WebContainer.boot();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('WebContainer boot timeout')), this.options.bootTimeout)
      );

      this.webcontainerInstance = await Promise.race([bootPromise, timeoutPromise]);
      this.isReady = true;
      
      // Setup event listeners
      this._setupEventListeners();
      
      eventBus.emit('webcontainer:booted', { instance: this.webcontainerInstance });
      console.log('✅ WebContainer booted successfully');
      
      return true;
      
    } catch (error) {
      console.error('❌ Failed to boot WebContainer:', error);
      this.isReady = false;
      return false;
    } finally {
      this.isBooting = false;
    }
  }

  /**
   * Mount files to WebContainer
   */
  async mountFiles(files) {
    if (!this.isReady) {
      console.warn('⚠️ WebContainer not ready, cannot mount files');
      return false;
    }

    try {
      await this.webcontainerInstance.mount(files);
      eventBus.emit('webcontainer:files-mounted', { files });
      console.log('✅ Files mounted to WebContainer');
      return true;
    } catch (error) {
      console.error('❌ Failed to mount files:', error);
      return false;
    }
  }

  /**
   * Install dependencies in WebContainer
   */
  async installDependencies() {
    if (!this.isReady) {
      console.warn('⚠️ WebContainer not ready, cannot install dependencies');
      return false;
    }

    try {
      const installProcess = await this.webcontainerInstance.spawn('npm', ['install']);
      
      // Store process reference
      this.processes.set('npm-install', installProcess);
      
      // Listen to output
      installProcess.output.pipeTo(new WritableStream({
        write(data) {
          console.log('[npm install]', data);
          eventBus.emit('webcontainer:install-output', { data });
        }
      }));

      const exitCode = await installProcess.exit;
      
      if (exitCode !== 0) {
        throw new Error(`npm install failed with exit code ${exitCode}`);
      }

      eventBus.emit('webcontainer:dependencies-installed');
      console.log('✅ Dependencies installed in WebContainer');
      return true;
      
    } catch (error) {
      console.error('❌ Failed to install dependencies:', error);
      return false;
    }
  }

  /**
   * Start development server in WebContainer
   */
  async startDevServer(command = 'npm', args = ['run', 'dev']) {
    if (!this.isReady) {
      console.warn('⚠️ WebContainer not ready, cannot start dev server');
      return false;
    }

    try {
      const serverProcess = await this.webcontainerInstance.spawn(command, args);
      
      // Store process reference
      this.processes.set('dev-server', serverProcess);
      
      // Listen to server output
      serverProcess.output.pipeTo(new WritableStream({
        write(data) {
          console.log('[dev-server]', data);
          eventBus.emit('webcontainer:server-output', { data });
          
          // Look for server URL in output
          const urlMatch = data.match(/Local:\s*(http:\/\/localhost:\d+)/);
          if (urlMatch) {
            this.serverUrl = urlMatch[1];
            eventBus.emit('webcontainer:server-ready', { url: this.serverUrl });
          }
        }
      }));

      // Wait for server to be ready
      await this.waitForServerReady();
      
      console.log('✅ Development server started in WebContainer');
      return true;
      
    } catch (error) {
      console.error('❌ Failed to start dev server:', error);
      return false;
    }
  }

  /**
   * Wait for server to be ready
   */
  async waitForServerReady(timeout = 30000) {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Server ready timeout'));
      }, timeout);

      const onServerReady = () => {
        clearTimeout(timeoutId);
        eventBus.off('webcontainer:server-ready', onServerReady);
        resolve();
      };

      eventBus.on('webcontainer:server-ready', onServerReady);
    });
  }

  /**
   * Write file to WebContainer
   */
  async writeFile(path, contents) {
    if (!this.isReady) {
      console.warn('⚠️ WebContainer not ready, cannot write file');
      return false;
    }

    try {
      await this.webcontainerInstance.fs.writeFile(path, contents);
      eventBus.emit('webcontainer:file-written', { path, size: contents.length });
      return true;
    } catch (error) {
      console.error('❌ Failed to write file:', error);
      return false;
    }
  }

  /**
   * Read file from WebContainer
   */
  async readFile(path) {
    if (!this.isReady) {
      console.warn('⚠️ WebContainer not ready, cannot read file');
      return null;
    }

    try {
      const contents = await this.webcontainerInstance.fs.readFile(path, 'utf-8');
      return contents;
    } catch (error) {
      console.error('❌ Failed to read file:', error);
      return null;
    }
  }

  /**
   * Get WebContainer URL for iframe embedding
   */
  getServerUrl() {
    return this.serverUrl;
  }

  /**
   * Get WebContainer instance
   */
  getInstance() {
    return this.webcontainerInstance;
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      isReady: this.isReady,
      isBooting: this.isBooting,
      serverUrl: this.serverUrl,
      supportResults: this.checkSupport(),
      activeProcesses: Array.from(this.processes.keys())
    };
  }

  /**
   * Setup event listeners
   */
  _setupEventListeners() {
    // Listen for hot reload events
    eventBus.on('file:changed', async (data) => {
      if (data.path && data.contents) {
        await this.writeFile(data.path, data.contents);
      }
    });

    // Listen for dependency changes
    eventBus.on('package:changed', async () => {
      await this.installDependencies();
    });
  }

  /**
   * Cleanup and destroy
   */
  async destroy() {
    console.log('🧹 Destroying WebContainer service...');

    // Kill all processes
    for (const [name, process] of this.processes.entries()) {
      try {
        process.kill();
        console.log(`✅ Killed process: ${name}`);
      } catch (error) {
        console.error(`❌ Failed to kill process ${name}:`, error);
      }
    }

    this.processes.clear();
    this.webcontainerInstance = null;
    this.isReady = false;
    this.isInitialized = false;
    this.serverUrl = null;

    eventBus.emit('webcontainer:destroyed');
  }
}

// Export singleton instance
export const webContainerService = new WebContainerService();
export default webContainerService;