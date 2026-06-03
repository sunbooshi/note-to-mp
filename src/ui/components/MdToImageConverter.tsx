import * as React from 'react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Select, Slider, ToggleGroup } from 'radix-ui';
import {
  ChevronDownIcon,
  ChevronUpIcon,
  CheckIcon,
  GearIcon,
  Cross2Icon,
} from '@radix-ui/react-icons';

import { usePluginStore } from 'src/store/PluginStore';
import { useRenderStore } from 'src/store/RenderStore';
import { useConfigContext } from 'src/store/ConfigStore';
import { useNotification } from './Notification';
import { NMPSettings } from 'src/settings';
import AssetsManager from 'src/assets';
import { ArticleRender } from 'src/article-render';
import { getMetadata, wxAddDraftImages, DraftImages, DraftImageMediaId } from 'src/weixin-api';
import { UploadImageToWx } from 'src/imagelib';
import { RedBookRender } from 'src/redbook-render';
import { uevent } from 'src/utils';
import AccountSelect from './AccountSelect';
import { toPng } from 'html-to-image';

import styles from './MdToImageConverter.module.css';

export interface MdToImageTheme {
  id: string;
  name: string;
  css: string;
}

export interface MdToImageSettings {
  pageMode: 'single' | 'multi' | 'hr';
  width: number;
  height: number;
  presetRatio: string;
  fontFamily: string;
  fontSize: number;
  backgroundType: 'theme' | 'color' | 'gradient';
  backgroundColor: string;
  backgroundGradient: string;
  padding: number;
  borderRadius: number;
  themeId: string;
}

export interface MdToImageConverterProps {
  htmlContent: string;
}

const formatFontFamily = (font: string) => {
  if (!font || font === '默认') return undefined;
  const systemKeywords = ['system-ui', 'sans-serif', 'serif', 'monospace', 'cursive', 'fantasy', 'inherit', 'initial', 'revert', 'unset'];
  if (systemKeywords.includes(font.toLowerCase())) {
    return font;
  }
  if ((font.startsWith('"') && font.endsWith('"')) || (font.startsWith("'") && font.endsWith("'"))) {
    return font;
  }
  return `"${font}"`;
};

const DEFAULT_SETTINGS: MdToImageSettings = {
  pageMode: 'single',
  width: 750,
  height: 1000,
  presetRatio: 'xhs-3-4',
  fontFamily: '默认',
  fontSize: 16,
  backgroundType: 'theme',
  backgroundColor: '#ffffff',
  backgroundGradient: 'linear-gradient(135deg, rgba(242, 243, 245, 0.9) 0%, rgba(251, 191, 188, 0.6) 100%)',
  padding: 40,
  borderRadius: 16,
  themeId: 'default',
};

const GRADIENT_PRESETS = [
  { name: '柔粉霞', value: 'linear-gradient(135deg, rgba(251, 191, 188, 0.9) 0%, rgba(254, 212, 164, 0.8) 100%)' },
  { name: '晨曦橘', value: 'linear-gradient(135deg, rgba(254, 212, 164, 0.8) 0%, rgba(255, 246, 122, 0.8) 100%)' },
  { name: '青芽绿', value: 'linear-gradient(135deg, rgba(255, 246, 122, 0.8) 0%, rgba(183, 237, 177, 0.8) 100%)' },
  { name: '晴空蓝', value: 'linear-gradient(135deg, rgba(183, 237, 177, 0.8) 0%, rgba(186, 206, 253, 0.7) 100%)' },
  { name: '薰衣草', value: 'linear-gradient(135deg, rgba(186, 206, 253, 0.7) 0%, rgba(216, 191, 216, 0.7) 100%)' },
  { name: '落樱白', value: 'linear-gradient(135deg, rgba(242, 243, 245, 0.9) 0%, rgba(251, 191, 188, 0.6) 100%)' },
  { name: '极光灰', value: 'linear-gradient(135deg, rgba(222, 224, 227, 0.8) 0%, rgba(242, 243, 245, 0.9) 100%)' },
];

const DEFAULT_COLORS = [
  'rgba(255,255,255,0)', 'rgb(251, 191, 188)', 'rgba(254, 212, 164, 0.8)',
  'rgba(255, 246, 122, 0.8)', 'rgba(183, 237, 177, 0.8)', 'rgba(186, 206, 253, 0.7)',
  'rgba(222, 224, 227, 0.8)', 'rgb(247, 105, 100)', 'rgb(255, 165, 61)', 
  'rgb(255, 233, 40)', 'rgb(98, 210, 86)', 'rgba(78, 131, 253, 0.55)', 
  'rgba(147, 90, 246, 0.55)', 'rgb(187, 191, 196)', 'rgb(242, 243, 245)'
];

const DEFAULT_COLOR_NAMES = [
  '透明', '浅红色', '浅橙色', '浅黄色',
  '浅绿色', '浅蓝色', '中灰色', '红色', 
  '橙色', '黄色', '绿色', '蓝色', 
  '紫色', '灰色', '浅灰色'
];

const getHexColor = (colorStr: string): string => {
  if (!colorStr) return '#ffffff';
  if (colorStr.startsWith('#')) {
    if (colorStr.length === 4) {
      return '#' + colorStr[1] + colorStr[1] + colorStr[2] + colorStr[2] + colorStr[3] + colorStr[3];
    }
    return colorStr.slice(0, 7);
  }
  if (colorStr.startsWith('rgb')) {
    const matches = colorStr.match(/\d+/g);
    if (matches && matches.length >= 3) {
      const r = parseInt(matches[0]).toString(16).padStart(2, '0');
      const g = parseInt(matches[1]).toString(16).padStart(2, '0');
      const b = parseInt(matches[2]).toString(16).padStart(2, '0');
      return `#${r}${g}${b}`;
    }
  }
  return '#ffffff';
};

const dataUrlToBlob = (dataUrl: string) => {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
};

interface SelectOption {
  value: string;
  label: string;
}

const RadixSelect: React.FC<{
  value: string;
  onValueChange: (val: string) => void;
  options: SelectOption[];
  placeholder?: string;
  label?: string;
}> = ({ value, onValueChange, options, placeholder, label }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <Select.Root value={value} onValueChange={onValueChange}>
        <Select.Trigger className={styles.SelectTrigger}>
          <Select.Value placeholder={placeholder} />
          <Select.Icon className={styles.SelectIcon}>
            <ChevronDownIcon />
          </Select.Icon>
        </Select.Trigger>
        <Select.Portal container={containerRef.current || undefined}>
          <Select.Content className={styles.SelectContent} position="popper" sideOffset={5}>
            <Select.ScrollUpButton className={styles.SelectScrollButton}>
              <ChevronUpIcon />
            </Select.ScrollUpButton>
            <Select.Viewport className={styles.SelectViewport}>
              <Select.Group>
                {label && <Select.Label className={styles.SelectLabel}>{label}</Select.Label>}
                {options.filter((opt) => opt.value && opt.value.trim() !== '').map((opt) => (
                  <Select.Item className={styles.SelectItem} value={opt.value} key={opt.value}>
                    <Select.ItemText>{opt.label}</Select.ItemText>
                    <Select.ItemIndicator className={styles.SelectItemIndicator}>
                      <CheckIcon />
                    </Select.ItemIndicator>
                  </Select.Item>
                ))}
              </Select.Group>
            </Select.Viewport>
            <Select.ScrollDownButton className={styles.SelectScrollButton}>
              <ChevronDownIcon />
            </Select.ScrollDownButton>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
    </div>
  );
};

export const MdToImageConverter: React.FC<MdToImageConverterProps> = ({ htmlContent }) => {
  const { notify } = useNotification();
  const app = usePluginStore((s) => s.app);
  const activeNote = useRenderStore.use.note();
  const renderVersion = useRenderStore.use.renderVersion();
  const appid = useConfigContext((s) => s.appid);

  const htmlRenderRef = useRef<ArticleRender>(new ArticleRender(app));
  const textRenderRef = useRef<RedBookRender>(new RedBookRender(app));

  const [instanceId] = useState(() => 'note-to-mp-sticker-' + Math.random().toString(36).slice(2, 9));

  const showMsg = (msg: string) => {
    notify({ type: 'success', title: msg });
  };

  const showErr = (msg: string) => {
    notify({ type: 'error', title: msg });
  };

  // State: Settings panel visibility (default: collapsed)
  const [settingsOpen, setSettingsOpen] = useState(false);

  // State: settings saved to localStorage
  const [settings, setSettings] = useState<MdToImageSettings>(() => {
    try {
      const saved = localStorage.getItem('md-to-image-saved-settings');
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const updateSettings = (updates: Partial<MdToImageSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...updates };
      localStorage.setItem('md-to-image-saved-settings', JSON.stringify(updated));
      return updated;
    });
  };

  // Local input string buffers to avoid layout jitter and allow editing/clamping
  const [widthInput, setWidthInput] = useState(settings.width.toString());
  const [heightInput, setHeightInput] = useState(settings.height.toString());

  useEffect(() => {
    setWidthInput(settings.width.toString());
  }, [settings.width]);

  useEffect(() => {
    setHeightInput(settings.height.toString());
  }, [settings.height]);

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  const debounceTimerRef = useRef<any>(null);

  const debouncedUpdateSettings = useCallback((updates: Partial<MdToImageSettings>) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      updateSettings(updates);
    }, 500);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // State: themes derived from AssetsManager
  const [themes, setThemes] = useState<MdToImageTheme[]>([]);

  useEffect(() => {
    const loadThemesList = () => {
      const highlightName = NMPSettings.getInstance().defaultHighlight || '默认';
      const highlight = AssetsManager.getInstance().getHighlight(highlightName);
      const highlightCSS = highlight ? highlight.css : '';
      const baseCSS = NMPSettings.getInstance().baseCSS ? `.note-to-mp {${NMPSettings.getInstance().baseCSS}}` : '';
      const customCSS = AssetsManager.getInstance().customCSS || '';

      const list = AssetsManager.getInstance().themes.map((t) => ({
        id: t.className || t.name,
        name: t.name,
        css: `${highlightCSS}\n\n${t.css}\n\n${baseCSS}\n\n${customCSS}`,
      }));
      setThemes(list);
    };

    loadThemesList();
  }, [renderVersion]);

  // Local fonts state
  const [fontList, setFontList] = useState<string[]>([
    '默认',
    'system-ui',
    'Microsoft YaHei',
    'PingFang SC',
    'SimHei',
    'Kaiti',
    'Arial',
    'Helvetica',
    'Georgia',
    'Times New Roman',
    'Courier New',
  ]);

  useEffect(() => {
    const fetchLocalFonts = async () => {
      if (document.visibilityState !== 'visible') {
        return;
      }
      if ('queryLocalFonts' in window) {
        try {
          const status = await navigator.permissions.query({ name: 'local-fonts' as any });
          if (status.state === 'granted' || status.state === 'prompt') {
            const fonts = await (window as any).queryLocalFonts();
            const uniqueFamilies = Array.from(
              new Set(
                fonts
                  .map((f: any) => f.family)
                  .filter((f: any) => typeof f === 'string' && f.trim() !== '')
              )
            ) as string[];
            if (uniqueFamilies.length > 0) {
              setFontList(['默认', ...uniqueFamilies.sort()]);
            }
          }
        } catch (e) {
          console.debug('Could not query local fonts, using fallbacks', e);
        }
      }
    };
    fetchLocalFonts();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchLocalFonts();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Measurement references
  const previewAreaRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const exportContainerRef = useRef<HTMLDivElement>(null);
  
  const [contentHeight, setContentHeight] = useState(0);
  const [pageOffsets, setPageOffsets] = useState<number[]>([0]);
  const [previewScale, setPreviewScale] = useState(1);
  const [scaleReady, setScaleReady] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [posting, setPosting] = useState(false);

  // Calculate page splitting offset boundaries
  const calculatePageOffsets = useCallback(() => {
    if (!measureRef.current) return;

    const container = measureRef.current;
    const children = Array.from(container.children) as HTMLElement[];
    const height = container.scrollHeight;

    if (settings.pageMode === 'single') {
      setPageOffsets([0]);
      setContentHeight(height);
      return;
    }

    if (settings.pageMode === 'hr') {
      const hrOffsets: number[] = [0];
      for (let i = 0; i < children.length; i++) {
        const child = children[i];
        if (child.tagName === 'HR') {
          let nextIndex = i + 1;
          while (nextIndex < children.length && children[nextIndex].tagName === 'HR') {
            nextIndex++;
          }
          if (nextIndex < children.length) {
            const nextStart = children[nextIndex].offsetTop;
            if (nextStart < height - 10) {
              if (!hrOffsets.includes(nextStart)) {
                hrOffsets.push(nextStart);
              }
            }
          }
          i = nextIndex - 1;
        }
      }

      if (!hrOffsets.includes(height)) {
        hrOffsets.push(height);
      }
      hrOffsets.sort((a, b) => a - b);

      const viewportHeightVal = Math.max(50, settings.height - 2 * settings.padding);
      const finalOffsets: number[] = [];

      for (let k = 0; k < hrOffsets.length - 1; k++) {
        const segmentStart = hrOffsets[k];
        const segmentEnd = hrOffsets[k + 1];

        finalOffsets.push(segmentStart);

        let currentTop = segmentStart;
        while (currentTop < segmentEnd) {
          const pageEnd = currentTop + viewportHeightVal;
          if (pageEnd >= segmentEnd) {
            break;
          }

          let splitPoint = pageEnd;
          let foundIntersecting = false;

          for (let i = 0; i < children.length; i++) {
            const child = children[i];
            const childTop = child.offsetTop;
            const childBottom = childTop + child.offsetHeight;

            if (childBottom <= currentTop || childTop >= segmentEnd) {
              continue;
            }

            if (childTop < pageEnd && childBottom > pageEnd) {
              foundIntersecting = true;
              const isHeading = /^(H[1-6])$/i.test(child.tagName);
              const fitsInOnePage = child.offsetHeight <= viewportHeightVal;

              if (isHeading || fitsInOnePage) {
                if (childTop > currentTop) {
                  splitPoint = childTop;
                } else {
                  splitPoint = pageEnd;
                }
              } else {
                splitPoint = pageEnd;
              }
              break;
            }

            if (childTop >= pageEnd) {
              splitPoint = childTop;
              foundIntersecting = true;
              break;
            }
          }

          if (!foundIntersecting) {
            splitPoint = pageEnd;
          }

          if (splitPoint <= currentTop) {
            splitPoint = currentTop + viewportHeightVal;
          }

          if (splitPoint >= segmentEnd) {
            break;
          }

          finalOffsets.push(splitPoint);
          currentTop = splitPoint;
        }
      }

      setPageOffsets(finalOffsets);
      setContentHeight(height);
      return;
    }

    const offsets: number[] = [0];
    let currentTop = 0;
    const viewportHeightVal = Math.max(50, settings.height - 2 * settings.padding);

    while (currentTop < height) {
      const pageEnd = currentTop + viewportHeightVal;
      if (pageEnd >= height) {
        break;
      }

      let splitPoint = pageEnd;
      let foundIntersecting = false;

      for (let i = 0; i < children.length; i++) {
        const child = children[i];
        const childTop = child.offsetTop;
        const childBottom = childTop + child.offsetHeight;

        if (childTop < pageEnd && childBottom > pageEnd) {
          foundIntersecting = true;
          const isHeading = /^(H[1-6])$/i.test(child.tagName);
          const fitsInOnePage = child.offsetHeight <= viewportHeightVal;

          if (isHeading || fitsInOnePage) {
            if (childTop > currentTop) {
              splitPoint = childTop;
            } else {
              splitPoint = pageEnd;
            }
          } else {
            splitPoint = pageEnd;
          }
          break;
        }

        if (childTop >= pageEnd) {
          splitPoint = childTop;
          foundIntersecting = true;
          break;
        }
      }

      if (!foundIntersecting) {
        splitPoint = pageEnd;
      }

      offsets.push(splitPoint);
      currentTop = splitPoint;
    }

    setPageOffsets(offsets);
    setContentHeight(height);
  }, [settings.pageMode, settings.height, settings.padding]);

  // Handle auto resize changes of contents
  useEffect(() => {
    if (measureRef.current) {
      const observer = new ResizeObserver(() => {
        calculatePageOffsets();
      });
      observer.observe(measureRef.current);
      calculatePageOffsets();
      return () => observer.disconnect();
    }
  }, [
    htmlContent,
    settings.width,
    settings.height,
    settings.padding,
    settings.fontSize,
    settings.fontFamily,
    settings.themeId,
    settings.pageMode,
    calculatePageOffsets,
  ]);

  // Adjust preview scaling size
  useEffect(() => {
    if (previewAreaRef.current) {
      const observer = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (entry) {
          const areaWidth = entry.contentRect.width;
          const targetWidth = settings.width || 750;
          if (areaWidth > 80) {
            const scale = Math.min(1, (areaWidth - 80) / targetWidth);
            setPreviewScale(scale > 0.1 ? scale : 0.1);
            setScaleReady(true);
          }
        }
      });
      observer.observe(previewAreaRef.current);
      const rect = previewAreaRef.current.getBoundingClientRect();
      if (rect.width > 80) {
        const scale = Math.min(1, (rect.width - 80) / settings.width);
        setPreviewScale(scale > 0.1 ? scale : 0.1);
        setScaleReady(true);
      }
      return () => observer.disconnect();
    }
  }, [settings.width]);

  const viewportWidth = settings.width - 2 * settings.padding;
  const viewportHeight = Math.max(50, settings.height - 2 * settings.padding);

  const totalPages = settings.pageMode === 'single' ? 1 : Math.max(1, pageOffsets.length);
  const pageHeight = settings.pageMode === 'single' ? contentHeight + 2 * settings.padding : settings.height;
  const isSplitByHr = settings.pageMode === 'hr';

  const applyPresetRatio = (ratio: string) => {
    let width = settings.width;
    let height = settings.height;

    switch (ratio) {
      case 'xhs-3-4':
        width = 750;
        height = 1000;
        break;
      case '9-16':
        width = 1080;
        height = 1920;
        break;
      case '1-1':
        width = 1080;
        height = 1080;
        break;
      case '4-3':
        width = 1024;
        height = 768;
        break;
      case '16-9':
        width = 1920;
        height = 1080;
        break;
      default:
        break;
    }

    updateSettings({ presetRatio: ratio, width, height });
  };

  const activeTheme = themes.find((t) => t.id === settings.themeId) || themes[0];

  const getBackgroundStyle = () => {
    if (settings.backgroundType === 'theme') {
      return {
        backgroundImage: '',
        backgroundColor: '',
      };
    }
    if (settings.backgroundType === 'gradient') {
      return {
        backgroundImage: settings.backgroundGradient,
        backgroundColor: '',
      };
    }
    return {
      backgroundImage: '',
      backgroundColor: settings.backgroundColor,
    };
  };

  const getPageContentHeight = (index: number) => {
    if (settings.pageMode === 'single') return contentHeight;
    const start = pageOffsets[index] !== undefined ? pageOffsets[index] : index * viewportHeight;
    const end = pageOffsets[index + 1] !== undefined ? pageOffsets[index + 1] : contentHeight;
    return Math.max(50, end - start);
  };

  const renderPage = (pageIndex: number, isExportTrack = false) => {
    const bgStyle = getBackgroundStyle();
    const offsetY = settings.pageMode === 'single'
      ? 0
      : (pageOffsets[pageIndex] !== undefined ? pageOffsets[pageIndex] : pageIndex * viewportHeight);

    const currentPageContentHeight = getPageContentHeight(pageIndex);

    return (
      <div
        key={pageIndex}
        className={`md-to-image-page-frame ${instanceId} ${isSplitByHr ? 'split-by-hr' : ''}`}
        style={{
          width: settings.width,
          height: pageHeight,
          borderRadius: settings.borderRadius,
          ...bgStyle,
          padding: settings.padding,
          boxSizing: 'border-box',
        }}
      >
        {!isExportTrack && settings.pageMode === 'multi' && (
          <div className={styles.pageBadge}>
            Page {pageIndex + 1} / {totalPages}
          </div>
        )}
        <div
          className={styles.pageOffsetContainer}
          style={{
            width: viewportWidth,
            height: currentPageContentHeight,
            overflow: 'hidden',
          }}
        >
          <div
            className={`md-to-image-rendered-content ${instanceId} ${isSplitByHr ? 'split-by-hr' : ''}`}
            style={{
              width: viewportWidth,
              transform: `translateY(-${offsetY}px)`,
              fontFamily: formatFontFamily(settings.fontFamily),
              fontSize: `${settings.fontSize}px`,
              background: 'transparent',
              backgroundColor: 'transparent',
              backgroundImage: 'none',
            }}
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        </div>
      </div>
    );
  };

  // EXPORT PNG IMAGES
  const handleExport = async () => {
    if (NMPSettings.getInstance().isAuthKeyVaild() === false) {
      showErr('请购买会员后使用导出功能');
      return;
    }

    if (!exportContainerRef.current) return;
    const elements = exportContainerRef.current.querySelectorAll('.md-to-image-page-frame');
    if (elements.length === 0) {
      showErr('未找到可导出的页面元素！');
      return;
    }

    setExporting(true);
    try {
      for (let i = 0; i < elements.length; i++) {
        const element = elements[i] as HTMLElement;

        await new Promise((resolve) => setTimeout(resolve, 80));

        const dataUrl = await toPng(element, {
          pixelRatio: 2,
          skipFonts: false,
          cacheBust: true,
        });

        const metadata = activeNote ? getMetadata(app, activeNote) : null;
        const rawTitle = (metadata && metadata.title) || (activeNote ? activeNote.basename : 'note');
        const title = rawTitle.replace(/[\\/:*?"<>|]/g, '-');
        const filename = `${title}_${i + 1}.png`;

        const link = document.createElement('a');
        link.download = filename;
        link.href = dataUrl;
        link.click();
        link.remove();
      }
      showMsg('图片导出成功！已启动下载。');
    } catch (error) {
      console.error('Export failed:', error);
      showErr('导出图片失败：' + error.message);
    } finally {
      setExporting(false);
    }

    uevent('export-images');
  };

  // POST IMAGES AS WECHAT MP DRAFT
  const handleMPPost = async (withDescription = false) => {
    if (NMPSettings.getInstance().isAuthKeyVaild() === false) {
      showErr('请购买会员后使用公众号发贴图功能');
      return;
    }

    if (!appid) {
      showErr('请先选择一个公众号账号');
      return;
    }

    if (!exportContainerRef.current) return;
    const elements = exportContainerRef.current.querySelectorAll('.md-to-image-page-frame');
    if (elements.length === 0) {
      showErr('未找到可导出的页面元素！');
      return;
    }

    setPosting(true);
    try {
      const token = await htmlRenderRef.current.getToken(appid);
      if (!token) {
        throw new Error('获取微信Token失败');
      }

      const imageList: DraftImageMediaId[] = [];

      for (let i = 0; i < elements.length; i++) {
        const element = elements[i] as HTMLElement;

        await new Promise((resolve) => setTimeout(resolve, 80));

        const dataUrl = await toPng(element, {
          pixelRatio: 2,
          skipFonts: false,
          cacheBust: true,
        });

        const blob = dataUrlToBlob(dataUrl);
        const filename = `${activeNote ? activeNote.basename : 'note'}-page-${i + 1}-${Date.now()}.png`;

        const uploadRes = await UploadImageToWx(blob, filename, token, 'image');
        if (!uploadRes.media_id) {
          throw new Error(`上传图片失败: ${uploadRes.errmsg}`);
        }

        imageList.push({
          image_media_id: uploadRes.media_id,
        });
      }

      const metadata = getMetadata(app, activeNote!);
      const title = metadata.title || (activeNote ? activeNote.basename : '无标题');

      let description = '';
      if (withDescription && activeNote) {
        const tempDiv = document.createElement('div');
        await textRenderRef.current.renderMarkdown(tempDiv, activeNote);
        description = textRenderRef.current.getArticleText(tempDiv);
      }

      const imagesData: DraftImages = {
        article_type: 'newspic',
        title: title,
        content: description,
        need_open_comment: metadata.need_open_comment || 0,
        only_fans_can_comment: metadata.only_fans_can_comment || 0,
        image_info: {
          image_list: imageList,
        }
      };

      const draftRes = await wxAddDraftImages(token, imagesData);
      if (draftRes.status !== 200) {
        throw new Error(`创建草稿失败, 状态码: ${draftRes.status}`);
      }

      const draft = draftRes.json;
      if (draft.media_id) {
        showMsg(withDescription ? '公众号发贴图（带描述）成功！已发布为草稿。' : '公众号发贴图成功！已发布为草稿。');
      } else {
        throw new Error(draft.errmsg || '返回结果为空');
      }

    } catch (error) {
      console.error('MP post failed:', error);
      showErr(withDescription ? '公众号发贴图（带描述）失败：' + error.message : '公众号发贴图失败：' + error.message);
    } finally {
      setPosting(false);
    }

    uevent(withDescription ? 'pub-sticker-desc' : 'pub-sticker');
  };

  // COPY TEXT HELPER
  const handleCopyText = async () => {
    if (!activeNote) return;
    try {
      const tempDiv = document.createElement('div');
      await textRenderRef.current.renderMarkdown(tempDiv, activeNote);
      await textRenderRef.current.copyWithoutCSS(tempDiv);
      showMsg('文案复制成功，快去小红书粘贴吧！');
    } catch (error) {
      showErr('文案复制失败：' + error.message);
    }
    uevent('copy-redbook');
  };

  // GOTO REDBOOK CREATOR
  const gotoRedBook = () => {
    const { shell } = require('electron');
    shell.openExternal('https://creator.xiaohongshu.com/');
    uevent('open-redbook');
  };

  // REFRESH SETTINGS
  const handleRefresh = async () => {
    try {
      await AssetsManager.getInstance().loadCustomCSS();
      await AssetsManager.getInstance().loadExpertSettings();
      useRenderStore.getState().setRenderVersion();
      showMsg('刷新成功');
    } catch (error) {
      showErr('刷新失败：' + error.message);
    }
  };

  return (
    <div className={styles.container}>
      {activeTheme && (
        <style dangerouslySetInnerHTML={{ __html: activeTheme.css.replace(/\.note-to-mp/g, `.${instanceId}`) }} />
      )}
      {isSplitByHr && (
        <style dangerouslySetInnerHTML={{ __html: `.${instanceId} hr { display: none !important; }` }} />
      )}

      {/* --- Top Panel: Actions Toolbar --- */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarActions}>
          <AccountSelect />
          
          <button
            className={styles.toolbarBtn}
            disabled={exporting || posting}
            onClick={() => handleMPPost(false)}
          >
            {posting ? (
              <>
                <div className={styles.spinner} style={{ marginRight: '6px', display: 'inline-block' }} />
                正在发布...
              </>
            ) : '公众号发贴图'}
          </button>

          <button
            className={styles.toolbarBtn}
            disabled={exporting || posting}
            onClick={() => handleMPPost(true)}
          >
            {posting ? (
              <>
                <div className={styles.spinner} style={{ marginRight: '6px', display: 'inline-block' }} />
                正在发布...
              </>
            ) : '公众号发贴图（带描述）'}
          </button>

          <button
            className={styles.toolbarBtn}
            disabled={exporting || posting}
            onClick={handleExport}
          >
            {exporting ? (
              <>
                <div className={styles.spinner} style={{ marginRight: '6px', display: 'inline-block' }} />
                正在生成...
              </>
            ) : '导出图片'}
          </button>

          <button className={styles.toolbarBtn} onClick={handleCopyText}>
            复制文案
          </button>

          <button className={styles.toolbarBtn} onClick={gotoRedBook}>
            去小红书
          </button>

          <button className={styles.toolbarBtn} onClick={handleRefresh}>
            刷新
          </button>
        </div>
      </div>

      {/* --- Main Content Section (Preview Area & Floating Settings panel) --- */}
      <div className={styles.mainContent}>
        {/* Backdrop overlay to close drawer on click outside */}
        <div
          className={`${styles.backdrop} ${settingsOpen ? styles.backdropVisible : styles.backdropHidden}`}
          onClick={() => setSettingsOpen(false)}
        />

        {/* Floating Settings Button */}
        <button
          className={styles.settingsToggleBtn}
          onClick={() => setSettingsOpen((prev) => !prev)}
          title="排版设置"
        >
          <GearIcon style={{ width: '20px', height: '20px' }} />
        </button>

        {/* Preview Container */}
        <div className={styles.previewArea} ref={previewAreaRef}>

          {(!htmlContent || !scaleReady) && (
            <div className={styles.previewLoading}>
              <div className={styles.loadingSpinner} />
              <span>{!htmlContent ? '正在编译笔记内容...' : '正在计算排版布局...'}</span>
            </div>
          )}

          <div
            className={styles.previewScaleWrapper}
            style={{
              transform: `scale(${previewScale})`,
              opacity: (htmlContent && scaleReady) ? 1 : 0,
              transition: 'opacity 0.2s ease-in-out',
            }}
          >
            <div className={styles.previewTitle}>
              尺寸 ({settings.width}px × {Math.round(pageHeight)}px)
            </div>

            <div className={styles.pagesList}>
              {Array.from({ length: totalPages }).map((_, i) => renderPage(i, false))}
            </div>
          </div>

          {/* Hidden measurement container */}
          <div
            style={{
              position: 'absolute',
              visibility: 'hidden',
              pointerEvents: 'none',
              width: viewportWidth,
              top: 0,
              left: 0,
              zIndex: -1,
            }}
          >
            <div
              ref={measureRef}
              className={`${instanceId} ${isSplitByHr ? 'split-by-hr' : ''}`}
              style={{
                width: viewportWidth,
                fontFamily: formatFontFamily(settings.fontFamily),
                fontSize: `${settings.fontSize}px`,
                lineHeight: 1.6,
                background: 'transparent',
                backgroundColor: 'transparent',
                backgroundImage: 'none',
              }}
              dangerouslySetInnerHTML={{ __html: htmlContent }}
            />
          </div>
        </div>

        {/* Floating Settings Panel */}
        <div className={`${styles.settingsArea} ${settingsOpen ? styles.expanded : styles.collapsed}`}>
          <div className={styles.settingsHeader}>
            <h2 className={styles.sectionTitle}>排版布局设置</h2>
            <button className={styles.closeBtn} onClick={() => setSettingsOpen(false)} title="收起">
              <Cross2Icon style={{ width: '16px', height: '16px' }} />
            </button>
          </div>

          {/* Export Slicing Mode ToggleGroup */}
          <div className={styles.formGroup}>
            <label className={styles.label}>导出模式</label>
            <ToggleGroup.Root
              type="single"
              value={settings.pageMode}
              onValueChange={(val) => {
                if (val) updateSettings({ pageMode: val as any });
              }}
              className={styles.ToggleGroup}
            >
              <ToggleGroup.Item value="single" className={styles.ToggleGroupItem}>
                单张长图
              </ToggleGroup.Item>
              <ToggleGroup.Item value="multi" className={styles.ToggleGroupItem}>
                多页切片
              </ToggleGroup.Item>
              <ToggleGroup.Item value="hr" className={styles.ToggleGroupItem}>
                按分割线切片
              </ToggleGroup.Item>
            </ToggleGroup.Root>
          </div>

          {/* Ratio Preset Selection ToggleGroup */}
          <div className={styles.formGroup}>
            <label className={styles.label}>比例预设</label>
            <ToggleGroup.Root
              type="single"
              value={settings.presetRatio}
              onValueChange={(val) => {
                if (val) applyPresetRatio(val);
              }}
              className={styles.PresetGrid}
            >
              <ToggleGroup.Item value="xhs-3-4" className={styles.PresetItem}>
                小红书 3:4
              </ToggleGroup.Item>
              <ToggleGroup.Item value="9-16" className={styles.PresetItem}>
                故事 9:16
              </ToggleGroup.Item>
              <ToggleGroup.Item value="1-1" className={styles.PresetItem}>
                正方形 1:1
              </ToggleGroup.Item>
              <ToggleGroup.Item value="4-3" className={styles.PresetItem}>
                标准 4:3
              </ToggleGroup.Item>
              <ToggleGroup.Item value="16-9" className={styles.PresetItem}>
                宽屏 16:9
              </ToggleGroup.Item>
              <ToggleGroup.Item value="custom" className={styles.PresetItem}>
                自定义
              </ToggleGroup.Item>
            </ToggleGroup.Root>
          </div>

          {/* Dimensions inputs */}
          <div className={styles.doubleRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>宽度 (px)</label>
              <input
                type="number"
                className={styles.inputText}
                value={widthInput}
                onChange={(e) => {
                  const val = e.target.value;
                  setWidthInput(val);
                  const parsed = parseInt(val);
                  if (!isNaN(parsed) && parsed > 0) {
                    debouncedUpdateSettings({ width: parsed, presetRatio: 'custom' });
                  }
                }}
                onBlur={() => {
                  if (debounceTimerRef.current) {
                    clearTimeout(debounceTimerRef.current);
                  }
                  const parsed = parseInt(widthInput) || 200;
                  const clamped = Math.max(200, parsed);
                  updateSettings({ width: clamped });
                  setWidthInput(clamped.toString());
                }}
                onKeyDown={handleInputKeyDown}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>页高度 (px)</label>
              <input
                type="number"
                className={styles.inputText}
                value={heightInput}
                disabled={settings.pageMode === 'single'}
                style={{ opacity: settings.pageMode === 'single' ? 0.5 : 1 }}
                onChange={(e) => {
                  const val = e.target.value;
                  setHeightInput(val);
                  const parsed = parseInt(val);
                  if (!isNaN(parsed) && parsed > 0) {
                    debouncedUpdateSettings({ height: parsed, presetRatio: 'custom' });
                  }
                }}
                onBlur={() => {
                  if (debounceTimerRef.current) {
                    clearTimeout(debounceTimerRef.current);
                  }
                  const parsed = parseInt(heightInput) || 200;
                  const clamped = Math.max(200, parsed);
                  updateSettings({ height: clamped });
                  setHeightInput(clamped.toString());
                }}
                onKeyDown={handleInputKeyDown}
              />
              {settings.pageMode === 'single' && (
                <span className={styles.inputDesc}>长图模式下高度自适应</span>
              )}
            </div>
          </div>

          <h2 className={styles.sectionTitle}>排版与主题</h2>

          {/* CSS Themes Selector */}
          {themes.length > 0 && (
            <div className={styles.formGroup}>
              <label className={styles.label}>CSS 主题</label>
              <RadixSelect
                value={settings.themeId}
                onValueChange={(val) => updateSettings({ themeId: val })}
                options={themes.map((t) => ({ value: t.id, label: t.name }))}
                placeholder="选择主题..."
              />
            </div>
          )}

          {/* Font Select Selector */}
          <div className={styles.formGroup}>
            <label className={styles.label}>字体选择</label>
            <RadixSelect
              value={settings.fontFamily}
              onValueChange={(val) => updateSettings({ fontFamily: val })}
              options={fontList.map((f) => ({ value: f, label: f }))}
              placeholder="选择字体..."
            />
          </div>

          {/* Manual font override */}
          <div className={styles.formGroup}>
            <label className={styles.label}>手动输入字体</label>
            <input
              type="text"
              className={styles.inputText}
              placeholder="自定义字体名称，如 Inter, Arial"
              value={settings.fontFamily}
              onChange={(e) => updateSettings({ fontFamily: e.target.value })}
            />
          </div>

          {/* Font Size Radix Slider */}
          <div className={styles.formGroup}>
            <div className={styles.sliderHeader}>
              <label className={styles.label}>字号大小</label>
              <span className={styles.sliderValue}>{settings.fontSize}px</span>
            </div>
            <Slider.Root
              className={styles.SliderRoot}
              value={[settings.fontSize]}
              min={12}
              max={40}
              step={1}
              onValueChange={(val) => updateSettings({ fontSize: val[0] })}
            >
              <Slider.Track className={styles.SliderTrack}>
                <Slider.Range className={styles.SliderRange} />
              </Slider.Track>
              <Slider.Thumb className={styles.SliderThumb} aria-label="Font size" />
            </Slider.Root>
          </div>

          <h2 className={styles.sectionTitle}>样式与背景</h2>

          {/* Background mode switcher ToggleGroup */}
          <div className={styles.formGroup}>
            <label className={styles.label}>背景模式</label>
            <ToggleGroup.Root
              type="single"
              value={settings.backgroundType}
              onValueChange={(val) => {
                if (val) updateSettings({ backgroundType: val as any });
              }}
              className={styles.ToggleGroup}
            >
              <ToggleGroup.Item value="theme" className={styles.ToggleGroupItem}>
                主题默认
              </ToggleGroup.Item>
              <ToggleGroup.Item value="color" className={styles.ToggleGroupItem}>
                纯色
              </ToggleGroup.Item>
              <ToggleGroup.Item value="gradient" className={styles.ToggleGroupItem}>
                渐变
              </ToggleGroup.Item>
            </ToggleGroup.Root>
          </div>

          {/* Background presets depending on mode */}
          {settings.backgroundType === 'color' && (
            <div className={styles.formGroup}>
              <label className={styles.label}>纯色背景色</label>
              <div className={styles.colorSwatchesGrid}>
                {DEFAULT_COLORS.map((color, idx) => {
                  const isActive = settings.backgroundColor === color;
                  const isTransparent = color.startsWith('rgba') && color.includes(',0)');
                  return (
                    <button
                      key={color + '-' + idx}
                      type="button"
                      className={`${styles.colorSwatch} ${isActive ? styles.active : ''} ${
                        isTransparent ? styles.transparentCheckerboard : ''
                      }`}
                      style={isTransparent ? {} : { backgroundColor: color }}
                      title={DEFAULT_COLOR_NAMES[idx] || color}
                      onClick={() => updateSettings({ backgroundColor: color })}
                    />
                  );
                })}

                {/* Custom Color Swatch */}
                {(() => {
                  const isCustomActive = !DEFAULT_COLORS.includes(settings.backgroundColor);
                  const hexColor = getHexColor(settings.backgroundColor);
                  return (
                    <div
                      className={`${styles.colorSwatch} ${styles.customSwatch} ${
                        isCustomActive ? styles.active : ''
                      }`}
                      style={isCustomActive ? { backgroundColor: settings.backgroundColor } : {}}
                      title="自定义"
                    >
                      <input
                        type="color"
                        className={styles.customColorPicker}
                        value={hexColor}
                        onChange={(e) => updateSettings({ backgroundColor: e.target.value })}
                      />
                    </div>
                  );
                })()}
              </div>

              <div className={styles.colorRow} style={{ marginTop: '8px' }}>
                <input
                  type="text"
                  className={styles.inputText}
                  value={settings.backgroundColor}
                  onChange={(e) => updateSettings({ backgroundColor: e.target.value })}
                  placeholder="十六进制或 rgb/rgba"
                />
              </div>
            </div>
          )}

          {settings.backgroundType === 'gradient' && (
            <div className={styles.formGroup}>
              <label className={styles.label}>渐变背景选择</label>
              <div className={styles.gradientPresets}>
                {GRADIENT_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    className={`${styles.gradientBtn} ${
                      settings.backgroundGradient === preset.value ? styles.active : ''
                    }`}
                    style={{ background: preset.value }}
                    title={preset.name}
                    onClick={() => updateSettings({ backgroundGradient: preset.value })}
                  />
                ))}
              </div>
              <input
                type="text"
                className={styles.inputText}
                value={settings.backgroundGradient}
                onChange={(e) => updateSettings({ backgroundGradient: e.target.value })}
                style={{ marginTop: '8px', fontSize: '11px' }}
              />
            </div>
          )}

          {/* Padding Radix Slider */}
          <div className={styles.formGroup}>
            <div className={styles.sliderHeader}>
              <label className={styles.label}>内边距 (Padding)</label>
              <span className={styles.sliderValue}>{settings.padding}px</span>
            </div>
            <Slider.Root
              className={styles.SliderRoot}
              value={[settings.padding]}
              min={0}
              max={100}
              step={1}
              onValueChange={(val) => updateSettings({ padding: val[0] })}
            >
              <Slider.Track className={styles.SliderTrack}>
                <Slider.Range className={styles.SliderRange} />
              </Slider.Track>
              <Slider.Thumb className={styles.SliderThumb} aria-label="Padding" />
            </Slider.Root>
          </div>

          {/* Border Radius Radix Slider */}
          <div className={styles.formGroup}>
            <div className={styles.sliderHeader}>
              <label className={styles.label}>圆角大小</label>
              <span className={styles.sliderValue}>{settings.borderRadius}px</span>
            </div>
            <Slider.Root
              className={styles.SliderRoot}
              value={[settings.borderRadius]}
              min={0}
              max={50}
              step={1}
              onValueChange={(val) => updateSettings({ borderRadius: val[0] })}
            >
              <Slider.Track className={styles.SliderTrack}>
                <Slider.Range className={styles.SliderRange} />
              </Slider.Track>
              <Slider.Thumb className={styles.SliderThumb} aria-label="Border radius" />
            </Slider.Root>
          </div>
        </div>
      </div>

      {/* --- Offscreen Rendering track for export --- */}
      <div className={styles.offscreenExportContainer} ref={exportContainerRef}>
        {Array.from({ length: totalPages }).map((_, i) => renderPage(i, true))}
      </div>
    </div>
  );
};

export default MdToImageConverter;
