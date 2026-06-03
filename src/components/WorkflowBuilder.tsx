import React, { useState } from 'react';
import { Sparkles, Terminal, FileCheck, HelpCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { LiquidCard } from './LiquidCard';

interface WorkflowBuilderProps {
  onCommitWorkflow: (fileName: string, content: string) => Promise<void>;
  loading: boolean;
}

export const WorkflowBuilder: React.FC<WorkflowBuilderProps> = ({ onCommitWorkflow, loading }) => {
  const [templateType, setTemplateType] = useState<'swift' | 'flutter' | 'react-native'>('swift');
  const [schemeName, setSchemeName] = useState('WorkspaceObj');
  const [bundleId, setBundleId] = useState('com.example.ipaapp');
  const [commitStatus, setCommitStatus] = useState<{ type: 'idle' | 'success' | 'error'; message: string }>({ type: 'idle', message: '' });

  // Powerful standard template generators for Github Actions
  const generateWorkflowYaml = () => {
    if (templateType === 'swift') {
      return `name: Build iOS IPA (Native Swift)

on:
  workflow_dispatch:
    inputs:
      build_configuration:
        description: 'Build Configuration (Debug / Release)'
        required: true
        default: 'Release'

jobs:
  build:
    name: Compile & Sign IPA
    runs-on: macos-14
    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4

      - name: Set up Xcode Version
        run: sudo xcode-select -s /Applications/Xcode_15.2.app/Contents/Developer

      - name: Install Pods (if applicable)
        run: |
          if [ -f "Podfile" ]; then
            pod install
          fi

      - name: Build and Package IPA (Unsigned Simulator/AdHoc Build)
        run: |
          # Create build folder
          mkdir -p build
          
          # Archive project
          xcodebuild archive \\
            -scheme "${schemeName}" \\
            -archivePath build/${schemeName}.xcarchive \\
            -sdk iphoneos \\
            CODE_SIGNING_ALLOWED=NO \\
            CODE_SIGNING_REQUIRED=NO \\
            CODE_SIGN_IDENTITY=""

          # Create Payload for unsigned IPA
          mkdir -p Payload
          cp -r build/${schemeName}.xcarchive/Products/Applications/*.app Payload/
          zip -r build/${schemeName}.ipa Payload
          rm -rf Payload

      - name: Upload IPA Build Artifact
        uses: actions/upload-artifact@v4
        with:
          name: ios-ipa-release
          path: build/*.ipa
          retention-days: 5
`;
    } else if (templateType === 'flutter') {
      return `name: Build iOS IPA (Flutter App)

on:
  workflow_dispatch:

jobs:
  build:
    name: Flutter iOS Compilation
    runs-on: macos-14
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Set up Java Development Kit (JDK)
        uses: actions/setup-java@v3
        with:
          distribution: 'zulu'
          java-version: '17'

      - name: Set up Flutter
        uses: subosito/flutter-action@v2
        with:
          channel: 'stable'
          architecture: x64

      - name: Flutter Environment Setup
        run: |
          flutter doctor -v
          flutter pub get

      - name: Create Unsigned Xcode Archive
        run: |
          flutter build ios --no-codesign --release

      - name: Assemble IPA Package
        run: |
          mkdir -p build/ios/iphoneos/Payload
          cp -r build/ios/iphoneos/Runner.app build/ios/iphoneos/Payload/
          cd build/ios/iphoneos
          zip -r Flutter_Unsigned.ipa Payload
          rm -rf Payload

      - name: Upload Finished IPA Payload
        uses: actions/upload-artifact@v4
        with:
          name: flutter-ipa-release
          path: build/ios/iphoneos/*.ipa
`;
    } else { // React Native
      return `name: Build iOS IPA (React Native App)

on:
  workflow_dispatch:

jobs:
  build:
    name: React Native iOS Compilation
    runs-on: macos-14
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Setup Node.js Environment
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install NPM Modules
        run: npm ci

      - name: Setup Ruby and Cocoapods
        uses: ruby/setup-ruby@v1
        with:
          ruby-version: '3.2'
          bundler-cache: true

      - name: Install iOS Pod Dependencies
        run: |
          cd ios
          pod install

      - name: Build Unsigned Xcode Project
        run: |
          cd ios
          xcodebuild archive \\
            -workspace ${schemeName}.xcworkspace \\
            -scheme ${schemeName} \\
            -archivePath build/${schemeName}.xcarchive \\
            -sdk iphoneos \\
            CODE_SIGNING_ALLOWED=NO \\
            CODE_SIGNING_REQUIRED=NO \\
            CODE_SIGN_IDENTITY=""

      - name: Package IPA File
        run: |
          mkdir -p ios/build/Payload
          cp -r ios/build/${schemeName}.xcarchive/Products/Applications/*.app ios/build/Payload/
          cd ios/build
          zip -r React_Native_Unsigned.ipa Payload
          rm -rf Payload

      - name: Upload React Native IPA Artifact
        uses: actions/upload-artifact@v4
        with:
          name: react-native-ipa-release
          path: ios/build/*.ipa
`;
    }
  };

  const handleCommitSubmit = async () => {
    const yaml = generateWorkflowYaml();
    const filePath = `.github/workflows/build-ipa.yml`;
    setCommitStatus({ type: 'idle', message: '' });
    
    try {
      await onCommitWorkflow(filePath, yaml);
      setCommitStatus({
        type: 'success',
        message: `Successfully created & committed "${filePath}" directly to your active repository branch!`
      });
    } catch (err: any) {
      setCommitStatus({
        type: 'error',
        message: err.message || "Failed to commit workflow file automatically."
      });
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      
      {/* Configuration Column */}
      <LiquidCard className="lg:col-span-2 border border-slate-200/50 dark:border-white/10 p-5 md:p-6" glowColor="violet">
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-violet-400" />
          Workflow Structurer
        </h3>
        
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">
          Configure a fully compatible GitHub Actions CI/CD yml template to run on Xcode Cloud MacOS runners, prepare, build, pack and export your iOS IPA binary.
        </p>

        <div className="space-y-4">
          {/* Framework Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2">Build Environment</label>
            <div className="grid grid-cols-3 gap-2">
              {(['swift', 'flutter', 'react-native'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTemplateType(t)}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all capitalize ${
                    templateType === t
                      ? 'bg-violet-500/20 text-violet-300 border-violet-500 shadow-md'
                      : 'bg-white/10 border-slate-200/50 dark:border-white/5 hover:bg-white/20 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {t === 'swift' ? 'Native Swift' : t === 'react-native' ? 'React Native' : 'Flutter'}
                </button>
              ))}
            </div>
          </div>

          {/* Scheme Configuration */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">Target Scheme / Target App</label>
            <input
              type="text"
              value={schemeName}
              onChange={(e) => setSchemeName(e.target.value)}
              placeholder="e.g. Runner, MyApp, ios"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200/50 dark:border-white/10 bg-white/20 dark:bg-slate-900/40 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm"
            />
          </div>

          {/* Bundle Identification */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">Bundle Identifier</label>
            <input
              type="text"
              value={bundleId}
              onChange={(e) => setBundleId(e.target.value)}
              placeholder="e.g. com.company.app"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200/50 dark:border-white/10 bg-white/20 dark:bg-slate-900/40 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm"
            />
          </div>

          {/* Guidelines */}
          <div className="p-3.5 bg-slate-100/50 dark:bg-slate-900/30 rounded-2xl border border-slate-200/50 dark:border-white/5 space-y-2">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
              <HelpCircle className="w-3.5 h-3.5 text-sky-400" />
              How it works
            </h4>
            <ul className="list-disc pl-4 text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
              <li>Commit code changes and workflow to the primary branch.</li>
              <li>Workflow will automatically trigger on dispatch from the app.</li>
              <li>Xcode archives the build, packages it securely into payload.</li>
              <li>Unsigned IPAs are compiled; ideal for simulators, AltStore, Sideloadly, or TrollStore testing!</li>
            </ul>
          </div>

          {/* Primary Action Button */}
          <button
            onClick={handleCommitSubmit}
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-sm tracking-wide shadow-lg hover:shadow-indigo-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Commiting Workflow Setup...
              </>
            ) : (
              <>
                <FileCheck className="w-4 h-4" />
                Commit Workflow to GitHub
              </>
            )}
          </button>

          {/* Success / Error notification */}
          {commitStatus.type !== 'idle' && (
            <div className={`p-4 rounded-xl flex gap-2.5 text-xs border ${
              commitStatus.type === 'success' 
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
            }`}>
              {commitStatus.type === 'success' ? (
                <FileCheck className="w-4 h-4 flex-shrink-0 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
              )}
              <span>{commitStatus.message}</span>
            </div>
          )}
        </div>
      </LiquidCard>

      {/* Code Preview Column */}
      <div className="lg:col-span-3 flex flex-col">
        <div className="flex-1 rounded-3xl bg-slate-900/90 dark:bg-slate-950/95 border border-slate-800 text-slate-300 p-5 font-mono text-xs overflow-y-auto max-h-[580px] shadow-2xl relative">
          <div className="absolute top-4 right-4 bg-slate-800/80 text-[10px] text-zinc-400 px-2 py-1 rounded-md flex items-center gap-1.5 border border-slate-700 select-none">
            <Terminal className="w-3 h-3 text-emerald-400" />
            .github/workflows/build-ipa.yml
          </div>
          <pre className="mt-4 leading-relaxed overflow-x-auto">
            {generateWorkflowYaml()}
          </pre>
        </div>
      </div>

    </div>
  );
};
