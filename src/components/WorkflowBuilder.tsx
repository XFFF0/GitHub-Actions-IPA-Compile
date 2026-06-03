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
  const [projectPath, setProjectPath] = useState('');
  const [signingMode, setSigningMode] = useState<'unsigned' | 'signed'>('unsigned');
  const [commitStatus, setCommitStatus] = useState<{ type: 'idle' | 'success' | 'error'; message: string }>({ type: 'idle', message: '' });

  // Powerful standard template generators for Github Actions
  const generateWorkflowYaml = () => {
    const cdCmd = projectPath ? `cd ${projectPath} && ` : '';
    const cdLine = projectPath ? `cd ${projectPath}\n          ` : '';

    const keychainStep = signingMode === 'signed' ? `
      - name: Install Apple Certificate & Provisioning Profile
        env:
          BUILD_CERTIFICATE_BASE64: \${{ secrets.BUILD_CERTIFICATE_BASE64 }}
          P12_PASSWORD: \${{ secrets.P12_PASSWORD }}
          BUILD_PROVISION_PROFILE_BASE64: \${{ secrets.BUILD_PROVISION_PROFILE_BASE64 }}
          KEYCHAIN_PASSWORD: \${{ secrets.KEYCHAIN_PASSWORD || 'temporarychain123' }}
        run: |
          CERTIFICATE_PATH=\$RUNNER_TEMP/build_certificate.p12
          PP_PATH=\$RUNNER_TEMP/build_pp.mobileprovision
          KEYCHAIN_PATH=\$RUNNER_TEMP/app-signing.keychain-db

          # Decode credentials from GitHub Secret vaults
          echo -n "\$BUILD_CERTIFICATE_BASE64" | base64 --decode --ignore-garbage > \$CERTIFICATE_PATH
          echo -n "\$BUILD_PROVISION_PROFILE_BASE64" | base64 --decode --ignore-garbage > \$PP_PATH

          # Setup secure keychain sandbox
          security create-keychain -p "\$KEYCHAIN_PASSWORD" \$KEYCHAIN_PATH
          security set-keychain-settings -lut 21600 \$KEYCHAIN_PATH
          security unlock-keychain -p "\$KEYCHAIN_PASSWORD" \$KEYCHAIN_PATH

          # Import and trust certificate
          security import \$CERTIFICATE_PATH -P "\$P12_PASSWORD" -A -t cert -f pkcs12 -k \$KEYCHAIN_PATH
          security list-keychain -d user -s \$KEYCHAIN_PATH

          # Install mobile provisioning profile
          mkdir -p ~/Library/MobileDevice/Provisioning\\ Profiles
          cp \$PP_PATH ~/Library/MobileDevice/Provisioning\\ Profiles/
` : '';

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
${keychainStep}
      - name: Install Pods (if applicable)
        run: |
          ${cdLine}if [ -f "Podfile" ]; then
            pod install
          fi

      - name: Build and Package IPA
        run: |
          ${cdLine}mkdir -p build
          
          # Archive project
          xcodebuild archive \\
            -scheme "${schemeName}" \\
            -archivePath build/${schemeName}.xcarchive \\
            -sdk iphoneos \\
            ${signingMode === 'unsigned' ? 'CODE_SIGNING_ALLOWED=NO \\\n            CODE_SIGNING_REQUIRED=NO \\\n            CODE_SIGN_IDENTITY=""' : ''}

          ${signingMode === 'unsigned' ? `
          # Create Unsigned IPA Payload (AltStore / TrollStore Sideload ready)
          mkdir -p Payload
          cp -r build/${schemeName}.xcarchive/Products/Applications/*.app Payload/
          zip -r build/${schemeName}.ipa Payload
          rm -rf Payload
          ` : `
          # Export legitimate Codesigned IPA using ExportOptions.plist
          cat <<EOF > ExportOptions.plist
          <?xml version="1.5" encoding="UTF-8"?>
          <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
          <plist version="1.0">
          <dict>
              <key>compileBitcode</key>
              <false/>
              <key>method</key>
              <string>development</string>
              <key>signingStyle</key>
              <string>automatic</string>
              <key>thinning</key>
              <string>&lt;none&gt;</string>
          </dict>
          </plist>
          EOF

          xcodebuild -exportArchive \\
            -archivePath build/${schemeName}.xcarchive \\
            -exportPath build \\
            -exportOptionsPlist ExportOptions.plist
          `}

      - name: Upload IPA Build Artifact
        uses: actions/upload-artifact@v4
        with:
          name: ios-ipa-release
          path: ${projectPath ? `${projectPath}/` : ''}build/*.ipa
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
${keychainStep}
      - name: Set up Flutter
        uses: subosito/flutter-action@v2
        with:
          channel: 'stable'
          architecture: x64

      - name: Flutter Environment Setup
        run: |
          ${cdLine}flutter doctor -v
          ${cdLine}flutter pub get

      - name: Create Xcode Archive
        run: |
          ${cdLine}flutter build ios ${signingMode === 'unsigned' ? '--no-codesign' : ''} --release

      - name: Assemble IPA Package
        run: |
          ${cdLine}mkdir -p build/ios/iphoneos/Payload
          ${cdLine}cp -r build/ios/iphoneos/Runner.app build/ios/iphoneos/Payload/
          ${cdLine}cd build/ios/iphoneos
          ${cdLine}zip -r Flutter_Unsigned.ipa Payload
          ${cdLine}rm -rf Payload

      - name: Upload Finished IPA Payload
        uses: actions/upload-artifact@v4
        with:
          name: flutter-ipa-release
          path: ${projectPath ? `${projectPath}/` : ''}build/ios/iphoneos/*.ipa
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
        run: |
          ${cdLine}npm ci
${keychainStep}
      - name: Setup Ruby and Cocoapods
        uses: ruby/setup-ruby@v1
        with:
          ruby-version: '3.2'
          bundler-cache: true

      - name: Install iOS Pod Dependencies
        run: |
          cd ${projectPath ? `${projectPath}/ios` : 'ios'}
          pod install

      - name: Build Xcode Project
        run: |
          cd ${projectPath ? `${projectPath}/ios` : 'ios'}
          xcodebuild archive \\
            -workspace ${schemeName}.xcworkspace \\
            -scheme ${schemeName} \\
            -archivePath build/${schemeName}.xcarchive \\
            -sdk iphoneos \\
            ${signingMode === 'unsigned' ? 'CODE_SIGNING_ALLOWED=NO \\\n            CODE_SIGNING_REQUIRED=NO \\\n            CODE_SIGN_IDENTITY=""' : ''}

      - name: Package IPA File
        run: |
          cd ${projectPath ? `${projectPath}/ios` : 'ios'}
          mkdir -p build/Payload
          cp -r build/${schemeName}.xcarchive/Products/Applications/*.app build/Payload/
          cd build
          zip -r React_Native_Unsigned.ipa Payload
          rm -rf Payload

      - name: Upload React Native IPA Artifact
        uses: actions/upload-artifact@v4
        with:
          name: react-native-ipa-release
          path: ${projectPath ? `${projectPath}/ios` : 'ios'}/build/*.ipa
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
          Workflow Structurer / منشئ ملف التشغيل
        </h3>
        
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">
          قم بتخصيص إعدادات ملف العمل لبناء وتجميع وتوقيع التطبيق جانبياً ودفعه مباشرة إلى مستودع GitHub الخاص بك.
        </p>

        <div className="space-y-4">
          {/* Framework Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2">Build Environment / بيئة التطوير</label>
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
              placeholder="e.g. Runner, WorkspaceObj, MyApp"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200/50 dark:border-white/10 bg-white/20 dark:bg-slate-900/40 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm"
            />
          </div>

          {/* Project Path / Subdirectory */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Project Folder / مجلد المشروع الفرعي
            </label>
            <input
              type="text"
              value={projectPath}
              onChange={(e) => setProjectPath(e.target.value)}
              placeholder="e.g. ios, my-subfolder (اتركه فارغاً إذا كان بالرئيسي)"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200/50 dark:border-white/10 bg-white/20 dark:bg-slate-900/40 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm font-mono"
            />
            <p className="text-[10px] text-zinc-400 mt-1">
              إذا كان ملف .xcodeproj لا يقع بالمسار الرئيسي للمستودع، من فضلك حدد اسم المجلد الفرعي هنا.
            </p>
          </div>

          {/* Signing Mode */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2">Signing Mode / وضع التوقيع الجانبي</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSigningMode('unsigned')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                  signingMode === 'unsigned'
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/55 shadow-md'
                    : 'bg-white/10 border-slate-200/50 dark:border-white/5 text-slate-600 dark:text-slate-300'
                }`}
              >
                Unsigned (لأدوات TrollStore, AltStore, Sideloadly)
              </button>
              <button
                type="button"
                onClick={() => setSigningMode('signed')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                  signingMode === 'signed'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/55 shadow-md'
                    : 'bg-white/10 border-slate-200/50 dark:border-white/5 text-slate-600 dark:text-slate-300'
                }`}
              >
                Signed (توقيع تلقائي بـ P12 & Profile)
              </button>
            </div>
          </div>

          {/* If Signed, Show Secrets Reminder description */}
          {signingMode === 'signed' && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-[11px] text-emerald-400 space-y-1.5 leading-relaxed">
              <span className="font-bold block">مطلوب إضافة سرّيات مستودع GitHub التالية (Repository Secrets):</span>
              <ul className="list-disc pl-4 space-y-0.5">
                <li><code className="bg-black/30 px-1 rounded text-[10px]">BUILD_CERTIFICATE_BASE64</code> : ملف الـ P12 مشفراً بـ Base64</li>
                <li><code className="bg-black/30 px-1 rounded text-[10px]">P12_PASSWORD</code> : كلمة مرور شهادة الـ P12</li>
                <li><code className="bg-black/30 px-1 rounded text-[10px]">BUILD_PROVISION_PROFILE_BASE64</code> : ملف الـ mobileprovision مشفراً بـ Base64</li>
              </ul>
            </div>
          )}

          {/* Guidelines */}
          <div className="p-3.5 bg-slate-100/50 dark:bg-slate-900/30 rounded-2xl border border-slate-200/50 dark:border-white/5 space-y-2">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
              <HelpCircle className="w-3.5 h-3.5 text-sky-400" />
              كيف يعمل البرنامج والتوقيع الجانبي
            </h4>
            <ul className="list-disc pl-4 text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
              <li>يقوم هذا القسم بإنشاء ملف تجميع متكامل وحفظه بمسار <code className="text-yellow-400">.github/workflows/build-ipa.yml</code></li>
              <li>يرجى التأكد من تطابق اسم الـ <strong>Scheme/Target App</strong> تماماً مع الإسم بمشروع Xcode وبدء بنائة من تبويب Actions Monitor</li>
              <li>الأجهزة المكركة أو الداعمة لـ <strong>TrollStore / Sideloadly / AltStore</strong> تستطيع تثبيت النسخة غير الموقعة مباشرة حيث تتولى تلك البرامج توقيعها أثناء التثبيت على جهازك.</li>
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
                Commit Workflow to GitHub / حفظ ملف التجميع ومزامنته
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
