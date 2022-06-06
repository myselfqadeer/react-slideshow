import React, { FC, useState, useRef, useEffect } from 'react';
import ResizeObserver from 'resize-observer-polyfill';
import TWEEN from '@tweenjs/tween.js';
import {
    getEasing,
    getStartingIndex,
    showIndicators,
    showNextArrow,
    showPreviousArrow,
} from './helpers';
import { ButtonClick, ZoomProps } from './types';
import { defaultProps } from './props';

export const FadeZoom: FC<ZoomProps> = props => {
    const [index, setIndex] = useState<number>(
        getStartingIndex(props.children, props.defaultIndex)
    );
    const wrapperRef = useRef<HTMLDivElement>(null);
    const innerWrapperRef = useRef<any>(null);
    const tweenGroup = new TWEEN.Group();
    const reactSlideshowWrapperRef = useRef<any>(null);
    let timeout: any;
    let resizeObserver: any;
    // const unhandledProps = getUnhandledProps(propTypes, props);

    const applyStyle = () => {
        if (innerWrapperRef.current && wrapperRef.current) {
            const wrapperWidth = wrapperRef.current.clientWidth;
            const fullwidth =
                wrapperWidth * React.Children.count(props.children);
            innerWrapperRef.current.style.width = `${fullwidth}px`;
            for (
                let index = 0;
                index < innerWrapperRef.current.children.length;
                index++
            ) {
                const eachDiv = innerWrapperRef.current.children[index];
                if (eachDiv) {
                    eachDiv.style.width = `${wrapperWidth}px`;
                    eachDiv.style.left = `${index * -wrapperWidth}px`;
                    eachDiv.style.display = `block`;
                }
            }
        }
    };

    useEffect(() => {
        initResizeObserver();
        play();
        return () => {
            tweenGroup.removeAll();
            clearTimeout(timeout);
            removeResizeObserver();
        };
    });

    useEffect(() => {
        const { autoplay, infinite, children, duration } = props;
        if (
            autoplay &&
            (infinite || index < React.Children.count(children) - 1)
        ) {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                transitionSlide((index + 1) % React.Children.count(children));
            }, duration);
        }
    }, [index]);

    const removeResizeObserver = () => {
        if (resizeObserver && reactSlideshowWrapperRef.current) {
            resizeObserver.unobserve(reactSlideshowWrapperRef.current);
        }
    };

    const pauseSlides = () => {
        if (props.pauseOnHover) {
            clearTimeout(timeout);
        }
    };

    const startSlides = () => {
        const { pauseOnHover, autoplay, duration } = props;
        if (pauseOnHover && autoplay) {
            timeout = setTimeout(() => goNext(), duration);
        }
    };

    const goNext = () => {
        const { children, infinite } = props;
        if (!infinite && index === React.Children.count(children) - 1) {
            return;
        }
        transitionSlide((index + 1) % React.Children.count(children));
    };

    const goBack = () => {
        const { children, infinite } = props;
        if (!infinite && index === 0) {
            return;
        }
        transitionSlide(
            index === 0 ? React.Children.count(children) - 1 : index - 1
        );
    };

    const preTransition: ButtonClick = event => {
        const { currentTarget } = event;
        if (currentTarget.dataset.type === 'prev') {
            goBack();
        } else {
            goNext();
        }
    };

    const initResizeObserver = () => {
        if (reactSlideshowWrapperRef.current) {
            resizeObserver = new ResizeObserver(entries => {
                if (!entries) return;
                applyStyle();
            });
            resizeObserver.observe(reactSlideshowWrapperRef.current);
        }
    };

    const play = () => {
        const { autoplay, children, duration } = props;
        if (autoplay && React.Children.count(children) > 1) {
            clearTimeout(timeout);
            timeout = setTimeout(() => transitionSlide(index + 1), duration);
        }
    };

    const transitionSlide = (newIndex: number) => {
        const existingTweens = tweenGroup.getAll();
        if (!existingTweens.length) {
            if (!innerWrapperRef.current?.children[newIndex]) {
                newIndex = 0;
            }
            clearTimeout(timeout);
            const value = { opacity: 0, scale: 1 };

            const animate = () => {
                requestAnimationFrame(animate);
                tweenGroup.update();
            };

            animate();

            const tween = new TWEEN.Tween(value, tweenGroup)
                .to(
                    { opacity: 1, scale: props.scale },
                    props.transitionDuration
                )
                .onUpdate(value => {
                    if (!innerWrapperRef.current) {
                        return;
                    }
                    innerWrapperRef.current.children[newIndex].style.opacity =
                        value.opacity;
                    innerWrapperRef.current.children[index].style.opacity =
                        1 - value.opacity;
                    innerWrapperRef.current.children[
                        index
                    ].style.transform = `scale(${value.scale})`;
                })
                .start();
            tween.easing(getEasing(props.easing));
            tween.onComplete(() => {
                setIndex(newIndex);
                if (innerWrapperRef.current) {
                    innerWrapperRef.current.children[
                        index
                    ].style.transform = `scale(1)`;
                }
                if (typeof props.onChange === 'function') {
                    props.onChange(index, newIndex);
                }
            });
        }
    };

    const goTo = (index: number) => {
        transitionSlide(index);
    };

    const navigate: ButtonClick = event => {
        const { currentTarget } = event;
        if (!currentTarget.dataset.key) {
            return;
        }
        if (parseInt(currentTarget.dataset.key) !== index) {
            goTo(parseInt(currentTarget.dataset.key));
        }
    };

    return (
        <div dir="ltr" aria-roledescription="carousel">
            <div
                className="react-slideshow-container"
                onMouseEnter={pauseSlides}
                onMouseOver={pauseSlides}
                onMouseLeave={startSlides}
                ref={reactSlideshowWrapperRef}
            >
                {props.arrows && showPreviousArrow(props, index, preTransition)}
                <div
                    className={`react-slideshow-fadezoom-wrapper ${props.cssClass}`}
                    ref={wrapperRef}
                >
                    <div
                        className="react-slideshow-fadezoom-images-wrap"
                        ref={innerWrapperRef}
                    >
                        {(
                            React.Children.map(
                                props.children,
                                thisArg => thisArg
                            ) || []
                        ).map((each, key) => (
                            <div
                                style={{
                                    opacity: key === index ? '1' : '0',
                                    zIndex: key === index ? '1' : '0',
                                }}
                                data-index={key}
                                key={key}
                                aria-roledescription="slide"
                                aria-hidden={key === index ? 'false' : 'true'}
                            >
                                {each}
                            </div>
                        ))}
                    </div>
                </div>
                {props.arrows && showNextArrow(props, index, preTransition)}
            </div>
            {props.indicators && showIndicators(props, index, navigate)}
        </div>
    );
};

FadeZoom.defaultProps = defaultProps;
