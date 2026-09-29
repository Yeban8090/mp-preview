import { Notice } from 'obsidian';

export class CopyManager {
    private static normalizeWechatStyles(container: HTMLElement): void {
        const fontSizes = new WeakMap<HTMLElement, number>([[container, 16]]);
        const lineHeights = new WeakMap<HTMLElement, number>([[container, 24]]);

        const toPixels = (value: string, fontSize: number, parentFontSize: number): number | null => {
            if (!value || value === 'normal') return null;
            if (/^\d*\.?\d+$/.test(value)) return parseFloat(value) * fontSize;
            if (value.endsWith('px')) return parseFloat(value);
            if (value.endsWith('rem')) return parseFloat(value) * 16;
            if (value.endsWith('em')) return parseFloat(value) * parentFontSize;
            if (value.endsWith('%')) return parseFloat(value) / 100 * parentFontSize;
            if (value.endsWith('pt')) return parseFloat(value) * 4 / 3;
            return null;
        };

        const removeCssVariables = (element: HTMLElement): void => {
            const styleText = element.getAttribute('style');
            if (!styleText?.includes('var(')) return;

            const safeDeclarations = styleText
                .split(';')
                .map(declaration => declaration.trim())
                .filter(declaration => declaration && !declaration.includes('var('));

            if (safeDeclarations.length) {
                element.setAttribute('style', `${safeDeclarations.join('; ')};`);
            } else {
                element.removeAttribute('style');
            }
        };

        container.querySelectorAll<HTMLElement>('*').forEach(element => {
            Array.from(element.attributes).forEach(attribute => {
                if (attribute.name.startsWith('data-')) {
                    element.removeAttribute(attribute.name);
                }
            });

            removeCssVariables(element);
            element.style.removeProperty('isolation');

            if (!['PRE', 'CODE'].includes(element.tagName)) {
                const whiteSpace = element.style.whiteSpace?.trim();
                if (whiteSpace === 'nowrap' || whiteSpace === 'pre') {
                    element.style.removeProperty('white-space');
                }
            }

            const textAlign = element.style.textAlign?.trim();
            if (textAlign && !['left', 'right', 'center'].includes(textAlign)) {
                element.style.textAlign = 'left';
            }

            const preservesOwnWidth = element.tagName === 'TABLE' ||
                element.classList.contains('code-indicators');
            if (!preservesOwnWidth) {
                ['width', 'min-width', 'max-width'].forEach(property => {
                    const value = element.style.getPropertyValue(property).trim();
                    if (value && (value.includes('%') || value.includes('vw') || value.startsWith('calc('))) {
                        element.style.removeProperty(property);
                    }
                });
            }

            if (['SECTION', 'BLOCKQUOTE', 'PRE', 'FIGURE', 'TABLE'].includes(element.tagName)) {
                element.style.boxSizing = 'border-box';
            }

            if (element.tagName === 'IMG') {
                element.removeAttribute('srcset');
                element.removeAttribute('sizes');
                element.removeAttribute('width');
                element.removeAttribute('height');
                element.style.width = 'auto';
                element.style.maxWidth = '100%';
                element.style.height = 'auto';
                element.style.display = 'block';
                element.style.boxSizing = 'border-box';
            }

            if (element.tagName === 'PRE' || element.tagName === 'CODE') {
                element.style.width = 'auto';
                element.style.maxWidth = '100%';
                element.style.whiteSpace = 'pre-wrap';
                element.style.overflowWrap = 'anywhere';
                element.style.wordBreak = 'break-word';
                element.style.overflowX = 'hidden';
            }

            if (element.tagName === 'BLOCKQUOTE') {
                element.style.margin = '24px 0px';
                element.style.maxWidth = '100%';
                element.style.overflowWrap = 'anywhere';
                element.style.wordBreak = 'break-word';
            }

            const parent = element.parentElement;
            const parentFontSize = parent ? fontSizes.get(parent) || 16 : 16;
            const ownFontSize = element.style.fontSize?.trim();
            const parsedFontSize = ownFontSize
                ? toPixels(ownFontSize, parentFontSize, parentFontSize)
                : null;
            const fontSize = parsedFontSize !== null && Number.isFinite(parsedFontSize) && parsedFontSize > 0
                ? parsedFontSize
                : parentFontSize;
            fontSizes.set(element, fontSize);

            const hasText = Boolean(element.textContent?.trim());
            const hasLineBreak = element.querySelector(':scope > br');

            // 公众号的结构检测不会始终正确解析继承字号。承载文本的内层
            // section/span/code 若只有 line-height，可能被误判为行高小于字号。
            if (hasText || hasLineBreak) {
                element.style.fontSize = `${fontSize}px`;
            }

            const ownLineHeight = element.style.lineHeight?.trim();
            const parsedLineHeight = ownLineHeight
                ? toPixels(ownLineHeight, fontSize, fontSize)
                : null;
            const inheritedLineHeight = parent ? lineHeights.get(parent) || fontSize * 2 : fontSize * 2;
            const minimumLineHeight = fontSize * 2;
            const lineHeight = Math.max(
                parsedLineHeight !== null && Number.isFinite(parsedLineHeight)
                    ? parsedLineHeight
                    : inheritedLineHeight,
                minimumLineHeight
            );
            lineHeights.set(element, lineHeight);

            if (hasText || hasLineBreak) {
                element.style.lineHeight = `${lineHeight}px`;
            }

            removeCssVariables(element);
        });
    }

    private static cleanupHtml(element: HTMLElement): string {
        // 创建克隆以避免修改原始元素
        const clone = element.cloneNode(true) as HTMLElement;

        // 移除所有的 data-* 属性
        clone.querySelectorAll('*').forEach(el => {
            Array.from(el.attributes).forEach(attr => {
                if (attr.name.startsWith('data-')) {
                    el.removeAttribute(attr.name);
                }
            });
        });

        // 移除所有的 class 属性
        clone.querySelectorAll('*').forEach(el => {
            el.removeAttribute('class');
        });

        // 移除所有的 id 属性
        clone.querySelectorAll('*').forEach(el => {
            el.removeAttribute('id');
        });

        // 使用 XMLSerializer 安全地转换为字符串
        const serializer = new XMLSerializer();
        return serializer.serializeToString(clone);
    }

    private static async processImages(container: HTMLElement): Promise<void> {
        const images = container.querySelectorAll('img');
        const imageArray = Array.from(images);
        
        for (const img of imageArray) {
            try {
                const response = await fetch(img.src);
                const blob = await response.blob();
                const reader = new FileReader();
                await new Promise((resolve, reject) => {
                    reader.onload = () => {
                        img.src = reader.result as string;
                        resolve(null);
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                });
            } catch (error) {
                console.error('图片转换失败:', error);
            }
        }
    }

    public static async copyToClipboard(element: HTMLElement): Promise<void> {
        try {
            const clone = element.cloneNode(true) as HTMLElement;
            await this.processImages(clone);

            const contentSection = clone.querySelector('.mp-content-section');
            if (!contentSection) {
                throw new Error('找不到内容区域');
            }

            this.normalizeWechatStyles(contentSection as HTMLElement);
            // 使用新的 cleanupHtml 方法
            const cleanHtml = this.cleanupHtml(contentSection as HTMLElement);

            const clipData = new ClipboardItem({
                'text/html': new Blob([cleanHtml], { type: 'text/html' }),
                'text/plain': new Blob([clone.textContent || ''], { type: 'text/plain' })
            });

            await navigator.clipboard.write([clipData]);
            new Notice('已复制到剪贴板');
        } catch (error) {
            new Notice('复制失败');
        }
    }
}
